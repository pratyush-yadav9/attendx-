import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.dependencies import generate_dynamic_qr_token, verify_dynamic_qr_token
from app.models.attendance import ClassSession, SessionStatus


class QRService:
    @staticmethod
    def generate_session_qr(
        db: Session,
        session: ClassSession
    ) -> Tuple[str, str, datetime]:
        """
        Generates a new dynamic QR token for an active class session,
        updates the database record, and returns (token, qr_data_url, expires_at).
        """
        token = generate_dynamic_qr_token(session.id, settings.QR_EXPIRY_SECONDS)
        expires_at = datetime.utcnow() + timedelta(seconds=settings.QR_EXPIRY_SECONDS)

        session.current_qr_token = token
        session.qr_expires_at = expires_at
        db.commit()

        # The QR code contains a direct URL or token to open the mobile attendance verification page
        # If FRONTEND_URL is localhost, resolve to LAN IP so mobile devices on the same Wi-Fi can scan and connect
        base_url = settings.FRONTEND_URL
        if "localhost" in base_url or "127.0.0.1" in base_url:
            try:
                import socket
                lan_ip = socket.gethostbyname(socket.gethostname())
                if lan_ip and not lan_ip.startswith("127."):
                    base_url = f"http://{lan_ip}:5173"
            except Exception:
                pass

        verification_url = f"{base_url}/verify?token={token}"

        # Generate QR image in memory
        qr_data_url = QRService.get_qr_image_data_url(token)

        return token, qr_data_url, expires_at

    @staticmethod
    def get_qr_image_data_url(token: str) -> str:
        """
        Renders a dynamic QR code image for a verification token and returns base64 PNG data URL.
        """
        base_url = settings.FRONTEND_URL
        if "localhost" in base_url or "127.0.0.1" in base_url:
            try:
                import socket
                lan_ip = socket.gethostbyname(socket.gethostname())
                if lan_ip and not lan_ip.startswith("127."):
                    base_url = f"http://{lan_ip}:5173"
            except Exception:
                pass

        verification_url = f"{base_url}/verify?token={token}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=3,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#0F2A5F", back_color="#FFFFFF")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    @staticmethod
    def validate_session_token(
        db: Session,
        token_str: str
    ) -> Tuple[bool, Optional[ClassSession], Optional[str]]:
        """
        Validates token format, signature, expiry, and active database session.
        Returns: (is_valid, session, error_message)
        """
        is_token_valid, session_id, err = verify_dynamic_qr_token(token_str)
        if not is_token_valid:
            return False, None, err

        session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if not session:
            return False, None, "Class session not found."

        if session.status != SessionStatus.ACTIVE.value:
            return False, session, f"Class session is not active (Status: {session.status}). Attendance cannot be marked."

        # Replay / invalidation check against current session token
        if session.current_qr_token and session.current_qr_token != token_str:
            # Check if this token was recently rotated
            if session.qr_expires_at and datetime.utcnow() > session.qr_expires_at:
                return False, session, "Attendance QR code has expired. A refreshed QR has been issued."

        return True, session, None
