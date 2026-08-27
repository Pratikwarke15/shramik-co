import math
import random
import string
from decimal import Decimal


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    dlat = (lat2 - lat1) * math.pi / 180
    dlng = (lng2 - lng1) * math.pi / 180
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180)
        * math.sin(dlng / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def normalize_skill(skill: str) -> str:
    return skill.strip().lower().replace("_", "-").replace(" ", "-")


def matches_skills(worker_skills, required_skills) -> bool:
    if not required_skills:
        return True
    worker_set = {normalize_skill(s) for s in (worker_skills or [])}
    return any(normalize_skill(s) in worker_set for s in required_skills)


def worker_match_score(avg_rating, total_jobs, distance_km, radius_km) -> float:
    distance_score = max(0.0, 1 - distance_km / max(radius_km, 1)) * 60
    rating_score = (float(avg_rating or 0) / 5) * 25
    track_record = min(float(total_jobs or 0) / 200, 1) * 15
    return round((distance_score + rating_score + track_record) * 10) / 10


def generate_booking_ref() -> str:
    now = __import__("datetime").datetime.now()
    date_str = f"{now.year}{now.month:02d}{now.day:02d}"
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"BG-{date_str}-{code}"


def num(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def num_or(value, default=0):
    v = num(value)
    return v if v is not None else default


def dt(value):
    """Serialize a datetime to ISO-8601 string (None-safe), for JSON responses."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def deep_serialize(obj):
    if isinstance(obj, dict):
        return {k: deep_serialize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [deep_serialize(v) for v in obj]
    if isinstance(obj, Decimal):
        return float(obj)
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj


def now_utc():
    """Naive UTC datetime. All timestamp columns are `timestamp without time zone`,
    so asyncpg requires offset-naive datetimes."""
    return __import__("datetime").datetime.utcnow()
