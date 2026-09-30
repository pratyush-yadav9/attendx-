import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL

# Handle SQLite vs PostgreSQL engine arguments
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    if (os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")) and "./attendx.db" in db_url:
        import tempfile
        db_url = "sqlite:///" + os.path.join(tempfile.gettempdir(), "attendx.db")
    engine = create_engine(db_url, connect_args=connect_args)
else:
    engine = create_engine(db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from sqlalchemy import text

def init_db():
    # Import all models to ensure they are registered on Base.metadata before creating tables
    import app.models  # noqa
    Base.metadata.create_all(bind=engine)
    # Ensure allowed_radius_meters column exists in class_sessions for existing databases
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE class_sessions ADD COLUMN allowed_radius_meters FLOAT DEFAULT 50.0"))
            conn.commit()
    except Exception:
        pass

