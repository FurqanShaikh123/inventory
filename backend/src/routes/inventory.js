import express from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all inventory items with filtering and pagination
router.get('/', (req, res) => {
  const {
    page = 1,
    limit = 50,
    category,
    status,
    search
  } = req.query;

  const offset = (page - 1) * limit;
  let query = `
    SELECT
      i.*,
      CASE
        WHEN i.current_stock <= 0 THEN 'critical'
        WHEN i.current_stock <= i.reorder_point THEN 'low'
        ELSE 'safe'
      END as status,
      p.sales_velocity,
      p.predicted_run_out_date,
      p.confidence_score
    FROM inventory_items i
    LEFT JOIN (
      SELECT
        item_id,
        sales_velocity,
        predicted_run_out_date,
        confidence_score,
        ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY prediction_date DESC) as rn
      FROM predictions
    ) p ON i.id = p.item_id AND p.rn = 1
    WHERE 1=1
  `;

  const params = [];

  if (category) {
    query += ' AND i.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (i.name LIKE ? OR i.category LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Add status filter after calculating status
  if (status && status !== 'all') {
    query = `
      SELECT * FROM (${query}) filtered_items
      WHERE status = ?
      ORDER BY name LIMIT ? OFFSET ?
    `;
    params.push(status, parseInt(limit), parseInt(offset));
  } else {
    query += ' ORDER BY i.name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get total count for pagination
    db.get('SELECT COUNT(*) as total FROM inventory_items', (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: countErr.message });
      }

      res.json({
        items: rows.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          currentStock: row.current_stock,
          reorderPoint: row.reorder_point,
          unitCost: row.unit_cost,
          sellingPrice: row.selling_price,
          supplier: row.supplier,
          location: row.location,
          status: {
            level: row.status,
            quantity: row.current_stock
          },
          salesVelocity: row.sales_velocity || 0,
          predictedRunOut: row.predicted_run_out_date,
          confidenceScore: row.confidence_score,
          updatedAt: row.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countRow.total,
          pages: Math.ceil(countRow.total / limit)
        }
      });
    });
  });
});

// Get single inventory item
router.get('/:id', (req, res) => {
  const query = `
    SELECT
      i.*,
      CASE
        WHEN i.current_stock <= 0 THEN 'critical'
        WHEN i.current_stock <= i.reorder_point THEN 'low'
        ELSE 'safe'
      END as status,
      p.sales_velocity,
      p.predicted_run_out_date,
      p.confidence_score
    FROM inventory_items i
    LEFT JOIN (
      SELECT
        item_id,
        sales_velocity,
        predicted_run_out_date,
        confidence_score,
        ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY prediction_date DESC) as rn
      FROM predictions
    ) p ON i.id = p.item_id AND p.rn = 1
    WHERE i.id = ?
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      id: row.id,
      name: row.name,
      category: row.category,
      currentStock: row.current_stock,
      reorderPoint: row.reorder_point,
      unitCost: row.unit_cost,
      sellingPrice: row.selling_price,
      supplier: row.supplier,
      location: row.location,
      status: {
        level: row.status,
        quantity: row.current_stock
      },
      salesVelocity: row.sales_velocity || 0,
      predictedRunOut: row.predicted_run_out_date,
      confidenceScore: row.confidence_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  });
});

// Create new inventory item
router.post('/', (req, res) => {
  const {
    name,
    category,
    currentStock = 0,
    reorderPoint = 0,
    unitCost = 0,
    sellingPrice = 0,
    supplier,
    location
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const id = uuidv4();
  const query = `
    INSERT INTO inventory_items
    (id, name, category, current_stock, reorder_point, unit_cost, selling_price, supplier, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    id, name, category, currentStock, reorderPoint,
    unitCost, sellingPrice, supplier, location
  ], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      id,
      message: 'Item created successfully'
    });
  });
});

// Update inventory item
router.put('/:id', (req, res) => {
  const {
    name,
    category,
    currentStock,
    reorderPoint,
    unitCost,
    sellingPrice,
    supplier,
    location
  } = req.body;

  const query = `
    UPDATE inventory_items
    SET name = ?, category = ?, current_stock = ?, reorder_point = ?,
        unit_cost = ?, selling_price = ?, supplier = ?, location = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [
    name, category, currentStock, reorderPoint,
    unitCost, sellingPrice, supplier, location, req.params.id
  ], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item updated successfully' });
  });
});

// Delete inventory item
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM inventory_items WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  });
});

// Get inventory statistics
router.get('/stats/overview', (req, res) => {
  const queries = {
    total: 'SELECT COUNT(*) as count FROM inventory_items',
    lowStock: `
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE current_stock <= reorder_point AND current_stock > 0
    `,
    critical: 'SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= 0',
    avgVelocity: `
      SELECT AVG(sales_velocity) as avg_velocity
      FROM predictions p
      INNER JOIN (
        SELECT item_id, MAX(prediction_date) as max_date
        FROM predictions
        GROUP BY item_id
      ) latest ON p.item_id = latest.item_id AND p.prediction_date = latest.max_date
    `
  };

  const stats = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      stats[key] = key === 'avgVelocity' ? row.avg_velocity || 0 : row.count;
      completed++;

      if (completed === totalQueries) {
        res.json(stats);
      }
    });
  });
});

export default router;