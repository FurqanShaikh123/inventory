import express from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple moving average prediction
function calculateMovingAverage(salesData, periods = 7) {
  if (salesData.length < periods) return 0;

  const recentSales = salesData.slice(-periods);
  const total = recentSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);
  return total / periods;
}

// Linear regression for trend analysis
function calculateLinearTrend(salesData) {
  if (salesData.length < 2) return 0;

  const n = salesData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  salesData.forEach((sale, index) => {
    const x = index;
    const y = sale.quantity_sold;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

// Seasonal adjustment based on day of week/month
function calculateSeasonalFactor(salesData) {
  if (salesData.length < 14) return 1.0;

  // Simple seasonal factor based on recent vs historical average
  const recentAvg = calculateMovingAverage(salesData.slice(-7), 7);
  const historicalAvg = calculateMovingAverage(salesData, salesData.length);

  return historicalAvg > 0 ? Math.max(0.5, Math.min(2.0, recentAvg / historicalAvg)) : 1.0;
}

// Main prediction algorithm
function predictStockDepletion(currentStock, salesData, reorderPoint) {
  if (salesData.length === 0) {
    return {
      salesVelocity: 0,
      predictedRunOutDate: null,
      confidenceScore: 0,
      seasonalFactor: 1.0
    };
  }

  // Calculate sales velocity (units per day)
  const movingAverage = calculateMovingAverage(salesData, 7);
  const trend = calculateLinearTrend(salesData.slice(-14)); // 2 weeks trend
  const seasonalFactor = calculateSeasonalFactor(salesData);

  // Adjust velocity with trend and seasonal factors
  const adjustedVelocity = (movingAverage + trend * 0.5) * seasonalFactor;
  const salesVelocity = Math.max(0.1, adjustedVelocity); // Minimum velocity

  // Calculate days until stock runs out
  const daysUntilRunOut = currentStock / salesVelocity;

  // Predict run out date
  let predictedRunOutDate = null;
  if (daysUntilRunOut > 0 && daysUntilRunOut < 365) { // Only predict within a year
    const runOutDate = new Date();
    runOutDate.setDate(runOutDate.getDate() + Math.ceil(daysUntilRunOut));
    predictedRunOutDate = runOutDate.toISOString().split('T')[0];
  }

  // Calculate confidence score based on data quality
  const dataPoints = salesData.length;
  const variability = calculateVariability(salesData);
  const baseConfidence = Math.min(dataPoints / 30, 1.0); // More data = higher confidence
  const variabilityPenalty = Math.max(0, 1 - variability / 5); // High variability = lower confidence
  const confidenceScore = Math.round((baseConfidence * variabilityPenalty) * 100) / 100;

  return {
    salesVelocity: Math.round(salesVelocity * 100) / 100,
    predictedRunOutDate,
    confidenceScore,
    seasonalFactor: Math.round(seasonalFactor * 100) / 100
  };
}

function calculateVariability(salesData) {
  if (salesData.length < 2) return 0;

  const mean = salesData.reduce((sum, sale) => sum + sale.quantity_sold, 0) / salesData.length;
  const variance = salesData.reduce((sum, sale) => sum + Math.pow(sale.quantity_sold - mean, 2), 0) / salesData.length;
  return Math.sqrt(variance);
}

// Generate predictions for all items
router.post('/generate', async (req, res) => {
  try {
    // Get all inventory items
    const items = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM inventory_items', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const predictions = [];
    let processed = 0;

    for (const item of items) {
      // Get sales data for the last 90 days
      const salesData = await new Promise((resolve, reject) => {
        const query = `
          SELECT quantity_sold, sale_date
          FROM sales_data
          WHERE item_id = ? AND sale_date >= date('now', '-90 days')
          ORDER BY sale_date ASC
        `;

        db.all(query, [item.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Generate prediction
      const prediction = predictStockDepletion(
        item.current_stock,
        salesData,
        item.reorder_point
      );

      // Save prediction to database
      const predictionId = uuidv4();
      const insertQuery = `
        INSERT INTO predictions
        (id, item_id, predicted_run_out_date, confidence_score, sales_velocity, seasonal_factor, model_version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await new Promise((resolve, reject) => {
        db.run(insertQuery, [
          predictionId,
          item.id,
          prediction.predictedRunOutDate,
          prediction.confidenceScore,
          prediction.salesVelocity,
          prediction.seasonalFactor,
          'v1.0'
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      predictions.push({
        itemId: item.id,
        itemName: item.name,
        ...prediction
      });

      processed++;
    }

    res.json({
      message: `Generated predictions for ${processed} items`,
      predictions
    });

  } catch (error) {
    console.error('Prediction generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get predictions for a specific item
router.get('/item/:id', (req, res) => {
  const query = `
    SELECT p.*, i.name as item_name, i.current_stock, i.reorder_point
    FROM predictions p
    JOIN inventory_items i ON p.item_id = i.id
    WHERE p.item_id = ?
    ORDER BY p.prediction_date DESC
    LIMIT 10
  `;

  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      currentStock: row.current_stock,
      reorderPoint: row.reorder_point,
      predictedRunOutDate: row.predicted_run_out_date,
      confidenceScore: row.confidence_score,
      salesVelocity: row.sales_velocity,
      seasonalFactor: row.seasonal_factor,
      predictionDate: row.prediction_date,
      modelVersion: row.model_version
    })));
  });
});

// Get chart data for predictions visualization
router.get('/chart/:id', (req, res) => {
  const { days = 30 } = req.query;

  // Get historical sales data
  const salesQuery = `
    SELECT
      DATE(sale_date) as date,
      SUM(quantity_sold) as daily_sales
    FROM sales_data
    WHERE item_id = ? AND sale_date >= date('now', '-${parseInt(days)} days')
    GROUP BY DATE(sale_date)
    ORDER BY sale_date ASC
  `;

  // Get current stock and latest prediction
  const predictionQuery = `
    SELECT
      i.current_stock,
      i.reorder_point,
      p.sales_velocity,
      p.predicted_run_out_date
    FROM inventory_items i
    LEFT JOIN (
      SELECT item_id, sales_velocity, predicted_run_out_date,
             ROW_NUMBER() OVER (ORDER BY prediction_date DESC) as rn
      FROM predictions WHERE item_id = ?
    ) p ON i.id = p.item_id AND p.rn = 1
    WHERE i.id = ?
  `;

  db.all(salesQuery, [req.params.id], (salesErr, salesRows) => {
    if (salesErr) {
      return res.status(500).json({ error: salesErr.message });
    }

    db.get(predictionQuery, [req.params.id, req.params.id], (predErr, predRow) => {
      if (predErr) {
        return res.status(500).json({ error: predErr.message });
      }

      if (!predRow) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Generate chart data
      const chartData = [];
      let currentStock = predRow.current_stock;
      const salesVelocity = predRow.sales_velocity || 0;
      const reorderPoint = predRow.reorder_point;

      // Historical data
      const salesMap = {};
      salesRows.forEach(row => {
        salesMap[row.date] = row.daily_sales;
      });

      // Generate data points for the last 30 days and next 30 days
      for (let i = -parseInt(days); i <= parseInt(days); i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        let actual = null;
        let predicted = null;

        if (i <= 0) {
          // Historical data
          actual = currentStock + (salesMap[dateStr] || 0) * (parseInt(days) + i);
          if (i === 0) predicted = currentStock;
        } else {
          // Future predictions
          predicted = Math.max(0, currentStock - (salesVelocity * i));
        }

        chartData.push({
          date: dateStr,
          actual,
          predicted,
          threshold: reorderPoint
        });
      }

      res.json(chartData);
    });
  });
});

// Get all items with low stock predictions
router.get('/alerts/low-stock', (req, res) => {
  const query = `
    SELECT
      i.id,
      i.name,
      i.category,
      i.current_stock,
      i.reorder_point,
      p.predicted_run_out_date,
      p.sales_velocity,
      p.confidence_score,
      CASE
        WHEN i.current_stock <= 0 THEN 'critical'
        WHEN i.current_stock <= i.reorder_point THEN 'low'
        WHEN p.predicted_run_out_date <= date('now', '+7 days') THEN 'warning'
        ELSE 'safe'
      END as alert_level
    FROM inventory_items i
    LEFT JOIN (
      SELECT
        item_id,
        predicted_run_out_date,
        sales_velocity,
        confidence_score,
        ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY prediction_date DESC) as rn
      FROM predictions
    ) p ON i.id = p.item_id AND p.rn = 1
    WHERE i.current_stock <= i.reorder_point
       OR p.predicted_run_out_date <= date('now', '+14 days')
    ORDER BY
      CASE
        WHEN i.current_stock <= 0 THEN 1
        WHEN i.current_stock <= i.reorder_point THEN 2
        ELSE 3
      END,
      p.predicted_run_out_date ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      currentStock: row.current_stock,
      reorderPoint: row.reorder_point,
      predictedRunOut: row.predicted_run_out_date,
      salesVelocity: row.sales_velocity,
      confidenceScore: row.confidence_score,
      alertLevel: row.alert_level
    })));
  });
});

export default router;