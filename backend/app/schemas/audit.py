from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
