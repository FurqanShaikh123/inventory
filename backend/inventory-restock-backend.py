# inventory-restock-backend.py
"""
Inventory Restock Predictor - Flask Backend

Endpoints:
- GET  /                       : Homepage showing backend running + SKU summary
- GET  /health                 : Health check
- POST /upload-sales           : Upload CSV or JSON sales data
- GET  /items                  : List all SKUs with stock info
- POST /predict                : Forecast SKU stock depletion
- POST /notify                 : Send notifications for low/critical stock
- GET  /download-sku/<sku>     : Download CSV for a SKU's sales

Run:
    python inventory-restock-backend.py
"""

import os
import json
from flask import Flask, request, jsonify, send_file
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from dotenv import load_dotenv

# Optional MongoDB
try:
    from pymongo import MongoClient
    mongo_available = True
except ImportError:
    mongo_available = False

# Optional email
import smtplib
from email.mime.text import MIMEText

load_dotenv()
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Thresholds
THRESHOLD_SAFE_DAYS = int(os.getenv("THRESHOLD_SAFE_DAYS", 30))
THRESHOLD_LOW_DAYS = int(os.getenv("THRESHOLD_LOW_DAYS", 7))

# SMTP config
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
NOTIFY_FROM = os.getenv("NOTIFY_FROM", SMTP_USER)

# MongoDB config
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "inventory_restocks")
if MONGO_URI and mongo_available:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
else:
    db = None

# In-memory storage fallback
sales_data = pd.DataFrame(columns=["date", "sku", "quantity"])
stock_data = {}  # current stock per SKU

# -------------------------
# Utilities
# -------------------------

def parse_csv(file_path):
    df = pd.read_csv(file_path)
    if not all(c in df.columns for c in ["date", "sku", "quantity"]):
        raise ValueError("CSV must have columns: date, sku, quantity")
    df['date'] = pd.to_datetime(df['date'])
    return df

def forecast_sku(df_sku, algo="ma", horizon=30, params=None):
    params = params or {}
    ts = df_sku.set_index('date')['quantity'].asfreq('D').fillna(0)
    forecast = []
    avg_daily = ts[-7:].mean() if len(ts) >= 7 else ts.mean()
    runout_date = None
    days_left = None
    category = "Safe"

    try:
        if algo == "ma":
            window = int(params.get("window", 7))
            forecast_values = ts.rolling(window=window).mean().iloc[-1]
            forecast_values = [forecast_values] * horizon
        elif algo == "exp":
            model = ExponentialSmoothing(ts, trend=None, seasonal=None)
            fit = model.fit()
            forecast_values = fit.forecast(horizon)
        elif algo == "arima":
            model = ARIMA(ts, order=(1,1,0))
            fit = model.fit()
            forecast_values = fit.forecast(horizon)
        else:
            forecast_values = [avg_daily] * horizon
    except Exception:
        forecast_values = [avg_daily] * horizon

    for i, qty in enumerate(forecast_values, 1):
        forecast.append({"day": i, "predicted_qty": float(qty)})

    current_stock = stock_data.get(df_sku['sku'].iloc[0], 0)
    days_left = int(current_stock / avg_daily) if avg_daily > 0 else 0
    runout_date = (datetime.today() + timedelta(days=days_left)).strftime("%Y-%m-%d")

    if days_left <= THRESHOLD_LOW_DAYS:
        category = "Critical"
    elif days_left <= THRESHOLD_SAFE_DAYS:
        category = "Low"

    return {
        "sku": df_sku['sku'].iloc[0],
        "forecast": forecast,
        "avg_daily_sales": float(avg_daily),
        "days_left": days_left,
        "runout_date": runout_date,
        "category": category,
        "current_stock": current_stock
    }

def send_email(to_emails, subject, body):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print("SMTP not configured. Skipping email.")
        return
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = NOTIFY_FROM
    msg['To'] = ", ".join(to_emails)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(NOTIFY_FROM, to_emails, msg.as_string())
        print(f"Sent email to {to_emails}")
    except Exception as e:
        print("Email send failed:", e)

# -------------------------
# Routes
# -------------------------

@app.route("/", methods=["GET"])
def home():
    """Homepage showing backend running + SKU summary"""
    items_summary = []
    if not sales_data.empty:
        for sku, group in sales_data.groupby("sku"):
            current = stock_data.get(sku, 0)
            avg_daily = group['quantity'].tail(7).mean() if len(group) >= 7 else group['quantity'].mean()
            days_left = int(current / avg_daily) if avg_daily > 0 else 0
            items_summary.append(f"{sku}: {current} units, ~{days_left} days left")
    summary_html = "<br>".join(items_summary) or "No SKUs uploaded yet."
    return f"<h2>Inventory Restock Predictor Backend Running!</h2><p>{summary_html}</p>"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status":"ok"}), 200

@app.route("/upload-sales", methods=["POST"])
def upload_sales():
    global sales_data
    file = request.files.get("file")
    if not file:
        return jsonify({"error":"No file uploaded"}), 400
    try:
        df = parse_csv(file)
        sales_data = pd.concat([sales_data, df], ignore_index=True)
        return jsonify({"message":"Sales uploaded", "rows": len(df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/items", methods=["GET"])
def list_items():
    items = []
    if sales_data.empty:
        return jsonify({"items": items})
    for sku, group in sales_data.groupby("sku"):
        current = stock_data.get(sku, 0)
        avg_daily = group['quantity'].tail(7).mean() if len(group) >= 7 else group['quantity'].mean()
        days_left = int(current / avg_daily) if avg_daily > 0 else 0
        runout = (datetime.today() + timedelta(days=days_left)).strftime("%Y-%m-%d")
        category = "Safe"
        if days_left <= THRESHOLD_LOW_DAYS:
            category = "Critical"
        elif days_left <= THRESHOLD_SAFE_DAYS:
            category = "Low"
        items.append({
            "sku": sku,
            "current_stock": current,
            "avg_daily_sales": float(avg_daily),
            "days_left": days_left,
            "runout_date": runout,
            "category": category
        })
    return jsonify({"items": items})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    sku = data.get("sku")
    algo = data.get("algorithm", "ma")
    horizon = int(data.get("horizon", 30))
    params = data.get("params", {})
    current_stock = data.get("current_stock")
    if current_stock is not None:
        stock_data[sku] = current_stock
    df_sku = sales_data[sales_data['sku'] == sku]
    if df_sku.empty:
        return jsonify({"error":"SKU not found"}), 404
    result = forecast_sku(df_sku, algo=algo, horizon=horizon, params=params)
    return jsonify(result)

@app.route("/notify", methods=["POST"])
def notify():
    data = request.get_json() or {}
    emails = data.get("emails", [])
    items_to_notify = []
    for item in sales_data['sku'].unique():
        df_sku = sales_data[sales_data['sku'] == item]
        result = forecast_sku(df_sku)
        if result['category'] in ["Low", "Critical"]:
            items_to_notify.append(result)
    if emails and items_to_notify:
        body = "Low/Critical stock alert:\n" + json.dumps(items_to_notify, indent=2)
        send_email(emails, "Inventory Alert", body)
    return jsonify({"notified_items": items_to_notify, "emails": emails})

@app.route("/download-sku/<sku>", methods=["GET"])
def download_sku(sku):
    df_sku = sales_data[sales_data['sku'] == sku]
    if df_sku.empty:
        return jsonify({"error":"SKU not found"}), 404
    file_path = f"{sku}_sales.csv"
    df_sku.to_csv(file_path, index=False)
    return send_file(file_path, as_attachment=True)

# -------------------------
# Auto-load sample CSV
# -------------------------
sample_file = "sample_sales.csv"
if os.path.exists(sample_file):
    try:
        sales_data = parse_csv(sample_file)
        print(f"Loaded sample sales: {len(sales_data)} rows")
        
        # Preload stock for each SKU
        stock_data = {
            "SKU001": 100,
            "SKU002": 50,
            "SKU003": 120,
            "SKU004": 80,
            "SKU005": 60
        }
        print("Preloaded current stock for SKUs")
        
    except Exception as e:
        print("Failed to load sample CSV:", e)

# -------------------------
# Run server
# -------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Flask on 127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)
