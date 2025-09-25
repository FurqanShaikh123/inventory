# agent.py
"""
AI Agent for Inventory Restock Predictor using Google Gemini API
- Talks to backend
- Can scan inventory, auto-decide notifications
- Can answer natural-language queries using Gemini API
"""

import os
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load env
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini client
try:
    from google import genai
    GEMINI_CLIENT = genai.Client()
    GEMINI_AVAILABLE = True if GEMINI_API_KEY else False
except Exception:
    GEMINI_AVAILABLE = False

class InventoryAgent:
    def __init__(self, backend_url=None):
        self.backend = backend_url or BACKEND_URL.rstrip('/')

    def _url(self, path):
        return f"{self.backend}{path}"

    def get_items(self):
        r = requests.get(self._url("/items"))
        r.raise_for_status()
        return r.json().get("items", [])

    def forecast_item(self, sku, algo="ma", horizon=30, current_stock=None, params=None):
        payload = {
            "sku": sku,
            "algorithm": algo,
            "horizon": int(horizon),
            "current_stock": current_stock,
            "params": params or {}
        }
        r = requests.post(self._url("/predict"), json=payload)
        r.raise_for_status()
        return r.json()

    def scan_and_notify(self, emails=None):
        payload = {"emails": emails or []}
        r = requests.post(self._url("/notify"), json=payload)
        r.raise_for_status()
        return r.json()

    def auto_decide(self, notify_emails=None):
        items = self.get_items()
        issues = [i for i in items if i.get("category") in ("Low", "Critical")]
        if not issues:
            return {"decision":"no_action", "message":"All items safe", "count": 0}
        notify_result = self.scan_and_notify(emails=notify_emails or [])
        return {"decision":"notified", "issues": issues, "notify_result": notify_result}

    def ask_natural_language(self, question):
        """Uses Gemini API for natural-language queries"""
        if not GEMINI_AVAILABLE:
            raise RuntimeError("Gemini API not configured. Set GEMINI_API_KEY in .env")
        try:
            response = GEMINI_CLIENT.models.generate_content(
                model="gemini-2.5-flash",
                contents=question
            )
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"

def print_items(items):
    if not items:
        print("No items found.")
        return
    print("SKU\tCurrent\tAvgDaily\tDaysLeft\tRunout\tCategory")
    for it in items:
        print(f"{it.get('sku')}\t{it.get('current_stock')}\t{round(it.get('avg_daily_sales',0),3)}\t{it.get('days_left')}\t{it.get('runout_date')}\t{it.get('category')}")

def usage():
    print("""Usage:
  python agent.py scan                    # fetch items and print
  python agent.py auto [email1,email2]    # run auto_decide and optionally notify listed emails
  python agent.py forecast <SKU> [horizon] [current_stock]  # forecast SKU
  python agent.py chat "your question"    # Gemini-based natural language
""")

if __name__ == "__main__":
    agent = InventoryAgent()
    if len(sys.argv) < 2:
        usage()
        sys.exit(0)

    cmd = sys.argv[1].lower()
    try:
        if cmd == "scan":
            items = agent.get_items()
            print_items(items)
        elif cmd == "auto":
            emails = None
            if len(sys.argv) >= 3:
                emails = sys.argv[2].split(",")
            res = agent.auto_decide(notify_emails=emails)
            print("Decision result:", res)
        elif cmd == "forecast":
            if len(sys.argv) < 3:
                print("forecast needs SKU")
                usage()
                sys.exit(1)
            sku = sys.argv[2]
            horizon = int(sys.argv[3]) if len(sys.argv) >= 4 else 30
            current_stock = int(sys.argv[4]) if len(sys.argv) >= 5 else None
            res = agent.forecast_item(sku, horizon=horizon, current_stock=current_stock)
            print("Forecast for", sku)
            for p in res.get("forecast", [])[:10]:
                print(f"Day {p['day']}: {p['predicted_qty']}")
            print("Summary:", {k:res.get(k) for k in ('avg_daily_sales','runout_date','days_left','category')})
        elif cmd == "chat":
            question = " ".join(sys.argv[2:])
            ans = agent.ask_natural_language(question)
            print("Gemini AI:", ans)
        else:
            usage()
    except Exception as e:
        print("Error:", e)
        sys.exit(1)
