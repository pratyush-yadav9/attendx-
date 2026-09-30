from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class LocationConfigCreate(BaseModel):
    campus_name: str = "Main Campus"
    latitude: float
    longitude: float
    radius_meters: float = 150.0
    is_active: bool = True


class LocationConfigResponse(BaseModel):
    id: str
    campus_name: str
    latitude: float
    longitude: float
    radius_meters: float
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class WifiConfigCreate(BaseModel):
    ssid: str
    bssid: Optional[str] = None
    building: Optional[str] = None
    status: str = "ACTIVE"


class WifiConfigResponse(BaseModel):
    id: str
    ssid: str
    bssid: Optional[str] = None
    building: Optional[str] = None
    status: str
    model_config = ConfigDict(from_attributes=True)


class SystemConfigUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
