import os

# 1. Ensure static folder exists
os.makedirs("static", exist_ok=True)
os.makedirs("app", exist_ok=True)

# 2. Fix app/main.py (prevents Uvicorn startup crash)
main_py_code = """from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="AttendX")

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")
"""

with open("app/main.py", "w", encoding="utf-8") as f:
    f.write(main_py_code)

# 3. Create static/index.html
index_html_code = """