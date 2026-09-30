from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    category: str = "ATTENDANCE_ALERT"


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DeviceTokenRegister(BaseModel):
    device_type: str = "WEB"
    token: str
