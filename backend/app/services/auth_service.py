import uuid
from datetime import timedelta

from .. import config
from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..security import generate_jwt, verify_password, hash_password, refresh_token as _refresh
from ..utils import now_utc
from . import sms_service

ROLE_ENUM = ("CONSUMER", "WORKER")


async def generate_otp(phone: str) -> dict:
    otp = str(uuid.uuid4().int)[:6] if False else f"{_rand_int():06d}"
    expires_at = now_utc() + timedelta(minutes=config.OTP_EXPIRY_MINUTES)
    await db.execute(
        """
        INSERT INTO "OtpVerification" (id, phone, otp, purpose, "expiresAt", verified, "createdAt")
        VALUES ($1, $2, $3, 'LOGIN', $4, false, $5)
        """,
        str(uuid.uuid4()), phone, otp, expires_at, now_utc(),
    )
    await sms_service.send_otp_sms(phone, otp)
    data = {"expiresAt": expires_at}
    if not config.IS_PROD:  # mirrors env.NODE_ENV !== 'production'
        data["otp"] = otp
    return data


async def verify_otp(phone: str, otp: str) -> dict:
    record = await db.fetchrow(
        """
        SELECT * FROM "OtpVerification"
        WHERE phone=$1 AND purpose='LOGIN' AND verified=false AND "expiresAt" >= $2
        ORDER BY "createdAt" DESC LIMIT 1
        """,
        phone, now_utc(),
    )
    if record is None:
        raise AppError("Invalid or expired OTP", 400)
    if record["otp"] != otp:
        raise AppError("Incorrect OTP", 400)
    await db.execute('UPDATE "OtpVerification" SET verified=true WHERE id=$1', record["id"])
    existing = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if existing is not None:
        token = generate_jwt({"id": existing["id"], "phone": existing["phone"], "role": existing["role"]})
        return {
            "verified": True,
            "token": token,
            "user": {"id": existing["id"], "phone": existing["phone"],
                     "name": existing["name"], "role": existing["role"]},
        }
    return {"verified": True}


async def register(data: dict) -> dict:
    phone = data["phone"]
    name = data["name"]
    email = (data.get("email") or "").strip() or None
    password = data["password"]
    role = data["role"]

    existing = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if existing is not None:
        raise AppError("Phone number already registered", 409)
    if email:
        existing_email = await db.fetchrow('SELECT * FROM "User" WHERE email=$1', email)
        if existing_email is not None:
            raise AppError("Email already registered", 409)

    password_hash = hash_password(password)
    user_id = str(uuid.uuid4())
    now = now_utc()
    await db.execute(
        """
        INSERT INTO "User" (id, phone, email, name, role, "passwordHash", locale, "isActive", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,'en',true,$7,$8)
        """,
        user_id, phone, email, name, role, password_hash, now, now,
    )

    if role == "CONSUMER":
        await db.execute(
            """
            INSERT INTO "ConsumerProfile" (id, "userId", "createdAt", "updatedAt")
            VALUES ($1,$2,$3,$3)
            """,
            str(uuid.uuid4()), user_id, now,
        )

    token = generate_jwt({"id": user_id, "phone": phone, "role": role})
    return {"token": token, "user": {"id": user_id, "phone": phone, "name": name,
                                     "email": email, "role": role}}


async def login(phone: str, password: str) -> dict:
    user = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if user is None:
        raise AppError("Invalid phone or password", 401)
    if not user["isActive"]:
        raise AppError("Account is deactivated", 403)
    if not verify_password(password, user["passwordHash"]):
        raise AppError("Invalid phone or password", 401)
    token = generate_jwt({"id": user["id"], "phone": user["phone"], "role": user["role"]})
    return {"token": token, "user": {"id": user["id"], "phone": user["phone"],
                                     "name": user["name"], "email": user["email"],
                                     "role": user["role"]}}


async def refresh(token: str) -> dict:
    import jwt as pyjwt
    try:
        payload = pyjwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        user = await db.fetchrow('SELECT * FROM "User" WHERE id=$1', payload["id"])
    except Exception:
        raise AppError("Invalid token", 401)
    if user is None:
        raise AppError("User not found", 404)
    if not user["isActive"]:
        raise AppError("Account is deactivated", 403)
    new_token = generate_jwt({"id": user["id"], "phone": user["phone"], "role": user["role"]})
    return {"token": new_token, "user": {"id": user["id"], "phone": user["phone"],
                                         "name": user["name"], "email": user["email"],
                                         "role": user["role"]}}


async def get_profile(user_id: str) -> dict:
    user = await db.fetchrow('SELECT * FROM "User" WHERE id=$1', user_id)
    if user is None:
        raise AppError("User not found", 404)
    consumer = await db.fetchrow('SELECT * FROM "ConsumerProfile" WHERE "userId"=$1', user_id)
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE "userId"=$1', user_id)
    coop_admin = await db.fetchrow('SELECT * FROM "CoopAdminProfile" WHERE "userId"=$1', user_id)

    worker_profile = None
    if worker is not None:
        worker_profile = dict(worker)
        worker_profile["totalEarnings"] = _to_float(worker["totalEarnings"])
        worker_profile["walletBalance"] = _to_float(worker["walletBalance"])

    return {
        "id": user["id"], "phone": user["phone"], "name": user["name"],
        "email": user["email"], "role": user["role"], "avatarUrl": user["avatarUrl"],
        "locale": user["locale"], "isActive": user["isActive"], "createdAt": user["createdAt"],
        "consumerProfile": dict(consumer) if consumer else None,
        "workerProfile": worker_profile,
        "coopAdminProfile": dict(coop_admin) if coop_admin else None,
    }

def _to_float(v):
    return float(v) if v is not None else None


def _rand_int() -> int:
    import random
    return random.randint(0, 999999)
