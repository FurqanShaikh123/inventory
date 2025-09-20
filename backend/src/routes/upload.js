import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    const allowedExtensions = ['.csv', '.json', '.txt'];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  }
});

// Upload and process sales data
router.post('/sales-data', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let salesData = [];

    if (fileExtension === '.csv') {
      salesData = await processCsvFile(filePath);
    } else if (fileExtension === '.json') {
      salesData = await processJsonFile(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    // Validate and save sales data
    const result = await saveSalesData(salesData);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'Sales data uploaded successfully',
      recordsProcessed: result.recordsProcessed,
      recordsSkipped: result.recordsSkipped,
      newItems: result.newItems,
      errors: result.errors
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Upload processing error:', error);
    res.status(500).json({
      error: 'Failed to process uploaded file',
      details: error.message
    });
  }
});

// Process CSV file
function processCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Expected CSV columns: item_name, item_category, quantity_sold, sale_date, unit_price
        const record = {
          itemName: data.item_name || data.name || data.product_name,
          itemCategory: data.item_category || data.category,
          quantitySold: parseInt(data.quantity_sold || data.quantity || data.qty),
          saleDate: data.sale_date || data.date,
          unitPrice: parseFloat(data.unit_price || data.price || 0)
        };

        if (record.itemName && record.quantitySold && record.saleDate) {
          results.push(record);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Process JSON file
async function processJsonFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(fileContent);

  // Handle both array format and object with data property
  const salesArray = Array.isArray(jsonData) ? jsonData : jsonData.data || [];

  return salesArray.map(record => ({
    itemName: record.item_name || record.name || record.product_name,
    itemCategory: record.item_category || record.category,
    quantitySold: parseInt(record.quantity_sold || record.quantity || record.qty),
    saleDate: record.sale_date || record.date,
    unitPrice: parseFloat(record.unit_price || record.price || 0)
  })).filter(record => record.itemName && record.quantitySold && record.saleDate);
}

// Save sales data to database
async function saveSalesData(salesData) {
  let recordsProcessed = 0;
  let recordsSkipped = 0;
  let newItems = 0;
  const errors = [];

  for (const record of salesData) {
    try {
      // Check if item exists, create if not
      let itemId = await findOrCreateItem(record.itemName, record.itemCategory);

      if (!itemId.existing) {
        newItems++;
      }

      // Insert sales record
      const saleId = uuidv4();
      const insertSaleQuery = `
        INSERT INTO sales_data (id, item_id, quantity_sold, sale_date, unit_price, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const totalAmount = record.quantitySold * (record.unitPrice || 0);

      await new Promise((resolve, reject) => {
        db.run(insertSaleQuery, [
          saleId,
          itemId.id,
          record.quantitySold,
          record.saleDate,
          record.unitPrice,
          totalAmount
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      recordsProcessed++;

    } catch (error) {
      recordsSkipped++;
      errors.push({
        record: record.itemName,
        error: error.message
      });
    }
  }

  return {
    recordsProcessed,
    recordsSkipped,
    newItems,
    errors: errors.slice(0, 10) // Limit error reporting
  };
}

// Find existing item or create new one
function findOrCreateItem(itemName, itemCategory) {
  return new Promise((resolve, reject) => {
    // First, try to find existing item
    const findQuery = 'SELECT id FROM inventory_items WHERE name = ? AND category = ?';

    db.get(findQuery, [itemName, itemCategory], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        resolve({ id: row.id, existing: true });
        return;
      }

      // Create new item
      const itemId = uuidv4();
      const insertQuery = `
        INSERT INTO inventory_items (id, name, category, current_stock, reorder_point)
        VALUES (?, ?, ?, 0, 10)
      `;

      db.run(insertQuery, [itemId, itemName, itemCategory || 'General'], (insertErr) => {
        if (insertErr) {
          reject(insertErr);
        } else {
          resolve({ id: itemId, existing: false });
        }
      });
    });
  });
}

// Upload inventory data (CSV/JSON)
router.post('/inventory-data', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let inventoryData = [];

    if (fileExtension === '.csv') {
      inventoryData = await processInventoryCsv(filePath);
    } else if (fileExtension === '.json') {
      inventoryData = await processInventoryJson(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    const result = await saveInventoryData(inventoryData);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'Inventory data uploaded successfully',
      recordsProcessed: result.recordsProcessed,
      recordsUpdated: result.recordsUpdated,
      recordsCreated: result.recordsCreated,
      errors: result.errors
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Inventory upload error:', error);
    res.status(500).json({
      error: 'Failed to process inventory file',
      details: error.message
    });
  }
});

// Process inventory CSV
function processInventoryCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        const record = {
          name: data.name || data.item_name || data.product_name,
          category: data.category || data.item_category,
          currentStock: parseInt(data.current_stock || data.stock || data.quantity || 0),
          reorderPoint: parseInt(data.reorder_point || data.min_stock || 10),
          unitCost: parseFloat(data.unit_cost || data.cost || 0),
          sellingPrice: parseFloat(data.selling_price || data.price || 0),
          supplier: data.supplier || '',
          location: data.location || ''
        };

        if (record.name && record.category) {
          results.push(record);
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Process inventory JSON
async function processInventoryJson(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(fileContent);

  const inventoryArray = Array.isArray(jsonData) ? jsonData : jsonData.data || [];

  return inventoryArray.map(record => ({
    name: record.name || record.item_name || record.product_name,
    category: record.category || record.item_category,
    currentStock: parseInt(record.current_stock || record.stock || record.quantity || 0),
    reorderPoint: parseInt(record.reorder_point || record.min_stock || 10),
    unitCost: parseFloat(record.unit_cost || record.cost || 0),
    sellingPrice: parseFloat(record.selling_price || record.price || 0),
    supplier: record.supplier || '',
    location: record.location || ''
  })).filter(record => record.name && record.category);
}

// Save inventory data
async function saveInventoryData(inventoryData) {
  let recordsProcessed = 0;
  let recordsUpdated = 0;
  let recordsCreated = 0;
  const errors = [];

  for (const record of inventoryData) {
    try {
      // Check if item exists
      const existingItem = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM inventory_items WHERE name = ?', [record.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingItem) {
        // Update existing item
        const updateQuery = `
          UPDATE inventory_items
          SET category = ?, current_stock = ?, reorder_point = ?,
              unit_cost = ?, selling_price = ?, supplier = ?, location = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        await new Promise((resolve, reject) => {
          db.run(updateQuery, [
            record.category, record.currentStock, record.reorderPoint,
            record.unitCost, record.sellingPrice, record.supplier,
            record.location, existingItem.id
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        recordsUpdated++;
      } else {
        // Create new item
        const itemId = uuidv4();
        const insertQuery = `
          INSERT INTO inventory_items
          (id, name, category, current_stock, reorder_point, unit_cost, selling_price, supplier, location)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
          db.run(insertQuery, [
            itemId, record.name, record.category, record.currentStock,
            record.reorderPoint, record.unitCost, record.sellingPrice,
            record.supplier, record.location
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        recordsCreated++;
      }

      recordsProcessed++;

    } catch (error) {
      errors.push({
        record: record.name,
        error: error.message
      });
    }
  }

  return {
    recordsProcessed,
    recordsUpdated,
    recordsCreated,
    errors: errors.slice(0, 10)
  };
}

// Get sample data format
router.get('/sample-format/:type', (req, res) => {
  const { type } = req.params;

  const samples = {
    sales: {
      csv: `item_name,item_category,quantity_sold,sale_date,unit_price
Premium Wireless Headphones,Electronics,2,2024-01-15,149.99
Organic Coffee Beans,Food & Beverage,5,2024-01-15,16.99
Bluetooth Smart Watch,Electronics,1,2024-01-16,249.99`,
      json: [
        {
          item_name: "Premium Wireless Headphones",
          item_category: "Electronics",
          quantity_sold: 2,
          sale_date: "2024-01-15",
          unit_price: 149.99
        },
        {
          item_name: "Organic Coffee Beans",
          item_category: "Food & Beverage",
          quantity_sold: 5,
          sale_date: "2024-01-15",
          unit_price: 16.99
        }
      ]
    },
    inventory: {
      csv: `name,category,current_stock,reorder_point,unit_cost,selling_price,supplier,location
Premium Wireless Headphones,Electronics,45,20,75.00,149.99,TechCorp,Warehouse A
Organic Coffee Beans,Food & Beverage,12,25,8.50,16.99,CoffeeSupply Inc,Storage B`,
      json: [
        {
          name: "Premium Wireless Headphones",
          category: "Electronics",
          current_stock: 45,
          reorder_point: 20,
          unit_cost: 75.00,
          selling_price: 149.99,
          supplier: "TechCorp",
          location: "Warehouse A"
        }
      ]
    }
  };

  if (!samples[type]) {
    return res.status(404).json({ error: 'Sample type not found' });
  }

  res.json(samples[type]);
});

export default router;