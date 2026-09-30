import os
import sys

# Ensure backend root is in sys.path so app imports work seamlessly
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Import the real AttendX FastAPI app
from app.main import app  # noqa
