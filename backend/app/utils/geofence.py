from math import radians, cos, sin, asin, sqrt
from typing import Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees).
    """
    # Earth radius in meters
    R = 6371000.0
    
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    
    a = sin(delta_phi / 2.0) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2.0) ** 2
    c = 2.0 * asin(sqrt(a))
    
    distance = R * c
    return round(distance, 2)


def verify_within_geofence(
    student_lat: float,
    student_lon: float,
    target_lat: float,
    target_lon: float,
    allowed_radius_meters: float
) -> Tuple[bool, float]:
    """
    Verifies if a coordinate falls within the specified radius of the target location.
    Returns: (is_within_geofence, distance_meters)
    """
    distance = haversine_distance(student_lat, student_lon, target_lat, target_lon)
    is_valid = distance <= allowed_radius_meters
    return is_valid, distance
