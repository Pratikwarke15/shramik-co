import bcrypt
import jwt

from . import config

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    # bcryptjs (Node) writes $2b$ hashes; python bcrypt reads them identically.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def generate_jwt(user: dict) -> str:
    # Mirrors jsonwebtoken sign({id, phone, role}, secret, {expiresIn})
    exp = _expires_seconds()
    now = _now()
    return jwt.encode(
        {"id": user["id"], "phone": user["phone"], "role": user["role"],
         "iat": now, "exp": now + exp},
        config.JWT_SECRET,
        algorithm=ALGORITHM,
    )


def verify_jwt(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ExpiredTokenError("Token expired")
    except jwt.InvalidTokenError:
        raise InvalidTokenError("Invalid token")


class ExpiredTokenError(Exception):
    pass


class InvalidTokenError(Exception):
    pass


def _expires_seconds() -> int:
    v = config.JWT_EXPIRES_IN
    if v.endswith("d"):
        return int(v[:-1]) * 86400
    if v.endswith("h"):
        return int(v[:-1]) * 3600
    if v.endswith("m"):
        return int(v[:-1]) * 60
    try:
        return int(v)
    except ValueError:
        return 7 * 86400


def _now() -> int:
    import time
    return int(time.time())


def refresh_token(token: str) -> str:
    payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM],
                         options={"verify_exp": False})
    return generate_jwt(payload)
