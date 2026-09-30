from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.notifications import Notification, NotificationToken
from app.schemas.notifications import DeviceTokenRegister
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification System"])


@router.get("")
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns unread and recent notifications for the logged-in user.
    """
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    unread_count = sum(1 for n in notifs if not n.is_read)

    return {
        "success": True,
        "unread_count": unread_count,
        "data": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "is_read": n.is_read,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for n in notifs
        ]
    }


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()

    return {"success": True, "message": "Notification marked as read."}


@router.put("/mark-all-read")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()

    return {"success": True, "message": "All notifications marked as read."}


@router.post("/token")
def register_device_token(
    data: DeviceTokenRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(NotificationToken).filter(NotificationToken.token == data.token).first()
    if existing:
        existing.user_id = current_user.id
    else:
        new_token = NotificationToken(
            user_id=current_user.id,
            device_type=data.device_type,
            token=data.token
        )
        db.add(new_token)
    db.commit()

    return {"success": True, "message": "Device notification token registered."}
