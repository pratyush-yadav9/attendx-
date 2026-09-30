from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models.config_models import CollegeWifiNetwork


class WifiVerificationResult:
    def __init__(
        self,
        is_verified: bool,
        status_code: str,
        message: str,
        matched_ssid: Optional[str] = None
    ):
        self.is_verified = is_verified
        self.status_code = status_code  # "VERIFIED", "BROWSER_UNSUPPORTED", "UNMATCHED_NETWORK", "NOT_CONFIGURED"
        self.message = message
        self.matched_ssid = matched_ssid


class WifiVerifierService:
    """
    Transparent Wi-Fi verification service adhering strictly to Web Standards.
    Normal web browsers do NOT expose connected Wi-Fi SSID/BSSID to standard JavaScript.
    This service supports:
    1. Direct SSID checks when provided via dedicated campus apps or portal headers.
    2. College configured Wi-Fi registry.
    3. Clear fallback status reporting without falsely claiming browser-level Wi-Fi inspection.
    """

    @staticmethod
    def verify_network(
        db: Session,
        reported_ssid: Optional[str] = None,
        reported_bssid: Optional[str] = None
    ) -> WifiVerificationResult:
        # Check active registered college networks
        active_networks = db.query(CollegeWifiNetwork).filter(
            CollegeWifiNetwork.status == "ACTIVE"
        ).all()
        
        if not active_networks:
            return WifiVerificationResult(
                is_verified=True,
                status_code="NOT_CONFIGURED",
                message="No college Wi-Fi restriction configured; verification bypassed."
            )

        if not reported_ssid and not reported_bssid:
            # Standard browser limitation
            return WifiVerificationResult(
                is_verified=True,  # Bypass gracefully with clear transparent status
                status_code="BROWSER_UNSUPPORTED",
                message="Browser cannot query local Wi-Fi SSID directly. Geofence and biometric checks used as primary verification."
            )

        # Check match against database
        for net in active_networks:
            if reported_ssid and net.ssid.strip().lower() == reported_ssid.strip().lower():
                return WifiVerificationResult(
                    is_verified=True,
                    status_code="VERIFIED",
                    message=f"Verified on authorized college network: {net.ssid}",
                    matched_ssid=net.ssid
                )
            if reported_bssid and net.bssid and net.bssid.strip().lower() == reported_bssid.strip().lower():
                return WifiVerificationResult(
                    is_verified=True,
                    status_code="VERIFIED",
                    message=f"Verified on authorized college access point ({net.bssid})",
                    matched_ssid=net.ssid
                )

        return WifiVerificationResult(
            is_verified=False,
            status_code="UNMATCHED_NETWORK",
            message=f"Reported network '{reported_ssid}' is not in the approved college Wi-Fi network list."
        )
