import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from app.database import Base


class CollegeLocation(Base):
    __tablename__ = "college_locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_name = Column(String(150), nullable=False, default="Main Campus")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, nullable=False, default=150.0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CollegeWifiNetwork(Base):
    __tablename__ = "college_wifi_networks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ssid = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "GEC_MADHUBANI_WIFI"
    bssid = Column(String(100), nullable=True)  # MAC address of access point
    building = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
