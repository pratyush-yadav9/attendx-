import os

# Get base project directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
INDEX_PATH = os.path.join(STATIC_DIR, "index.html")

# Create static directory if missing
os.makedirs(STATIC_DIR, exist_ok=True)

# 1. Create static/index.html
html_code = """