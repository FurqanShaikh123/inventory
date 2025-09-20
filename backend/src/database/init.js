import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../data/inventory.db');

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Database initialization
export async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Inventory Items table
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          current_stock INTEGER NOT NULL DEFAULT 0,
          reorder_point INTEGER NOT NULL DEFAULT 0,
          unit_cost REAL DEFAULT 0,
          selling_price REAL DEFAULT 0,
          supplier TEXT,
          location TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sales Data table
      db.run(`
        CREATE TABLE IF NOT EXISTS sales_data (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          quantity_sold INTEGER NOT NULL,
          sale_date DATE NOT NULL,
          unit_price REAL,
          total_amount REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES inventory_items (id)
        )
      `);

      // Stock Movements table
      db.run(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
          quantity INTEGER NOT NULL,
          reason TEXT,
          reference_number TEXT,
          movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT,
          FOREIGN KEY (item_id) REFERENCES inventory_items (id)
        )
      `);

      // Predictions table
      db.run(`
        CREATE TABLE IF NOT EXISTS predictions (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          predicted_run_out_date DATE,
          confidence_score REAL,
          sales_velocity REAL,
          seasonal_factor REAL,
          prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          model_version TEXT,
          FOREIGN KEY (item_id) REFERENCES inventory_items (id)
        )
      `);

      // Alerts table
      db.run(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          alert_type TEXT CHECK(alert_type IN ('low_stock', 'critical_stock', 'predicted_stockout')) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES inventory_items (id)
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_sales_item_date ON sales_data (item_id, sale_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements (item_id, movement_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_item ON predictions (item_id, prediction_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts (is_read, created_at)`);

      // Insert sample data
      insertSampleData();

      resolve();
    });
  });
}

function insertSampleData() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM inventory_items", (err, row) => {
    if (err || row.count > 0) return;

    // Sample inventory items
    const items = [
      {
        id: 'item-001',
        name: 'Premium Wireless Headphones',
        category: 'Electronics',
        current_stock: 45,
        reorder_point: 20,
        unit_cost: 75.00,
        selling_price: 149.99,
        supplier: 'TechCorp',
        location: 'Warehouse A'
      },
      {
        id: 'item-002',
        name: 'Organic Coffee Beans',
        category: 'Food & Beverage',
        current_stock: 12,
        reorder_point: 25,
        unit_cost: 8.50,
        selling_price: 16.99,
        supplier: 'CoffeeSupply Inc',
        location: 'Storage B'
      },
      {
        id: 'item-003',
        name: 'Bluetooth Smart Watch',
        category: 'Electronics',
        current_stock: 3,
        reorder_point: 15,
        unit_cost: 120.00,
        selling_price: 249.99,
        supplier: 'TechCorp',
        location: 'Warehouse A'
      },
      {
        id: 'item-004',
        name: 'Eco-Friendly Water Bottle',
        category: 'Lifestyle',
        current_stock: 67,
        reorder_point: 30,
        unit_cost: 12.00,
        selling_price: 24.99,
        supplier: 'EcoProducts',
        location: 'Warehouse C'
      },
      {
        id: 'item-005',
        name: 'Protein Powder Vanilla',
        category: 'Health',
        current_stock: 8,
        reorder_point: 20,
        unit_cost: 25.00,
        selling_price: 49.99,
        supplier: 'HealthSupplements',
        location: 'Storage B'
      },
      {
        id: 'item-006',
        name: 'Yoga Mat Premium',
        category: 'Fitness',
        current_stock: 23,
        reorder_point: 15,
        unit_cost: 18.00,
        selling_price: 39.99,
        supplier: 'FitnessGear',
        location: 'Warehouse C'
      }
    ];

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO inventory_items
      (id, name, category, current_stock, reorder_point, unit_cost, selling_price, supplier, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach(item => {
      insertItem.run([
        item.id, item.name, item.category, item.current_stock,
        item.reorder_point, item.unit_cost, item.selling_price,
        item.supplier, item.location
      ]);
    });

    insertItem.finalize();

    // Insert sample sales data (last 30 days)
    const salesData = [];
    const today = new Date();

    items.forEach(item => {
      for (let i = 0; i < 30; i++) {
        const saleDate = new Date(today);
        saleDate.setDate(today.getDate() - i);

        // Random sales based on item popularity
        const baseQuantity = item.category === 'Electronics' ? 2 :
          item.category === 'Food & Beverage' ? 5 : 3;
        const quantity = Math.floor(Math.random() * baseQuantity) + 1;

        if (Math.random() > 0.3) { // 70% chance of sale on any given day
          salesData.push({
            id: `sale-${item.id}-${i}`,
            item_id: item.id,
            quantity_sold: quantity,
            sale_date: saleDate.toISOString().split('T')[0],
            unit_price: item.selling_price,
            total_amount: quantity * item.selling_price
          });
        }
      }
    });

    const insertSale = db.prepare(`
      INSERT INTO sales_data (id, item_id, quantity_sold, sale_date, unit_price, total_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    salesData.forEach(sale => {
      insertSale.run([
        sale.id, sale.item_id, sale.quantity_sold,
        sale.sale_date, sale.unit_price, sale.total_amount
      ]);
    });

    insertSale.finalize();

    console.log('Sample data inserted successfully');
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});