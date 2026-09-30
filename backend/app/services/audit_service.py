import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User


class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        target_type: str,
        user: Optional[User] = None,
        target_id: Optional[str] = None,
        details: Optional[Any] = None,
        ip_address: Optional[str] = None,
        status: str = "SUCCESS"
    ) -> AuditLog:
        """
        Record a security or operational event in the audit log.
        Passwords and sensitive tokens must NEVER be passed to details.
        """
        user_id = user.id if user else "SYSTEM"
        user_email = user.email if user else "system@attendx.local"
        user_role = user.role if user else "SYSTEM"

        details_str = None
        if details is not None:
            if isinstance(details, (dict, list)):
                # Ensure no secrets leak in audit
                sanitized = {k: v for k, v in details.items() if "password" not in k.lower() and "token" not in k.lower()} if isinstance(details, dict) else details
                details_str = json.dumps(sanitized)
            else:
                details_str = str(details)

        audit_entry = AuditLog(
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details_str,
            ip_address=ip_address,
            status=status
        )
        db.add(audit_entry)
        db.commit()
        return audit_entry
