Inventory Restock Backend + Agent

Files:
- inventory-restock-backend.py  (Flask REST API)  [from canvas]
- agent.py                      (lightweight agent CLI)
- requirements.txt
- .env                          (create from .env.example)
- sample_sales.csv              (optional sample)

Steps:
1. Create virtualenv, activate
2. pip install -r requirements.txt
3. copy .env.example -> .env and edit
4. python inventory-restock-backend.py  # in one terminal
5. python agent.py scan                 # in another terminal (uses BACKEND_URL)
