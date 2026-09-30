import os
import sys

# Ensure backend root is in sys.path so app imports work seamlessly
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Import the real AttendX FastAPI app
from app.main import app  # noqa
from app.database import init_db
from app.seed import seed_database

# Ensure database tables and initial accounts exist on serverless cold-start
try:
    init_db()
    seed_database()
except Exception as e:
    print(f"[AttendX] Serverless cold-start seed: {e}")
