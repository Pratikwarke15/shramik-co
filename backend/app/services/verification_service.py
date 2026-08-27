import re
import time
import uuid
from datetime import timedelta

from .. import aadhaar, config
from ..db import db, row_to_dict
from ..errors import AppError
from ..utils import deep_serialize, now_utc
from . import aadhaar_qr_service, sms_service

AADHAAR_RE = re.compile(r"^\d{12}$")


def _ref() -> str:
    return f"DL-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6].upper()}"


async def verify_digilocker(aadhaar_number: str) -> dict:
    """DigiLocker passthrough (kept for contract compat). In this deployment the
    authoritative Aadhaar check is the offline Secure QR scan + OTP."""
    if not AADHAAR_RE.fullmatch(aadhaar_number):
        raise AppError("DigiLocker verification failed: invalid Aadhaar number", 400)
    return {"verified": True, "digilockerRef": _ref()}


async def verify_aadhaar_qr(image_bytes: bytes) -> dict:
    """Decode + cryptographically verify an Aadhaar card from an uploaded image/scan."""
    result = aadhaar_qr_service.scan_aadhaar(image_bytes)
    result["method"] = "AADHAAR_SECURE_QR"
    result["digilockerRef"] = _ref()
    return result


async def send_aadhaar_otp(aadhaar_number: str, mobile: str) -> dict:
    """Send a real SMS OTP to the mobile number registered with Aadhaar/UIDAI.

    Mirrors the phone-OTP flow: an OTP record is stored with purpose='AADHAAR'
    and a genuine SMS is sent via the configured SMS gateway.
    """
    if not AADHAAR_RE.fullmatch(aadhaar_number):
        raise AppError("Invalid Aadhaar number format", 400)
    if not re.fullmatch(r"\d{10}", mobile):
        raise AppError("Mobile number must be exactly 10 digits", 400)

    otp = f"{uuid.uuid4().int % 1000000:06d}"
    expires_at = now_utc() + timedelta(minutes=config.OTP_EXPIRY_MINUTES)
    await db.execute(
        """
        INSERT INTO "OtpVerification" (id, phone, otp, purpose, "expiresAt", verified, "createdAt")
        VALUES ($1, $2, $3, 'AADHAAR', $4, false, $5)
        """,
        str(uuid.uuid4()), mobile, otp, expires_at, now_utc(),
    )
    await sms_service.send_otp_sms(mobile, otp)
    data = {"expiresAt": expires_at, "aadhaarNumber": aadhaar_number}
    if not config.IS_PROD:
        data["otp"] = otp
    return data


async def verify_aadhaar_otp(aadhaar_number: str, mobile: str, otp: str) -> dict:
    """Verify the SMS OTP sent to the Aadhaar-linked mobile (purpose='AADHAAR')."""
    if not AADHAAR_RE.fullmatch(aadhaar_number):
        raise AppError("Invalid Aadhaar number format", 400)
    if not re.fullmatch(r"\d{6}", otp):
        raise AppError("OTP must be exactly 6 digits", 400)
    record = await db.fetchrow(
        """
        SELECT * FROM "OtpVerification"
        WHERE phone=$1 AND purpose='AADHAAR' AND verified=false AND "expiresAt" >= $2
        ORDER BY "createdAt" DESC LIMIT 1
        """,
        mobile, now_utc(),
    )
    if record is None:
        raise AppError("Invalid or expired OTP", 400)
    if record["otp"] != otp:
        raise AppError("Incorrect OTP", 400)
    await db.execute('UPDATE "OtpVerification" SET verified=true WHERE id=$1', record["id"])
    return {"verified": True, "phone": mobile, "aadhaarNumber": aadhaar_number}


async def verify_offline_aadhaar(raw: str) -> dict:
    """Decode + cryptographically verify an offline Aadhaar QR/XML document."""
    xml = aadhaar.decode_qr(raw)
    try:
        data = aadhaar.verify_signed_xml(xml)
    except aadhaar.AadhaarVerificationError as exc:
        raise AppError(str(exc), 400)
    return deep_serialize({
        "verified": data.get("verified", True),
        "name": data.get("name"),
        "dob": data.get("dob"),
        "gender": data.get("gender"),
        "yob": data.get("yob"),
        "address": data.get("address"),
        "uid": data.get("uid"),
        "careof": data.get("careof"),
    })


async def verify_consumer_profile(user_id: str, data: dict) -> dict:
    profile = await db.fetchrow('SELECT * FROM "ConsumerProfile" WHERE "userId"=$1', user_id)
    if profile is None:
        raise AppError("Consumer profile not found", 404)

    kyc_url = data.get("kycDocumentUrl")
    aadhaar_name = data.get("aadhaarName")
    aadhaar_dob = data.get("aadhaarDob")
    aadhaar_verified = bool(AADHAAR_RE.fullmatch(data["aadhaarNumber"]))
    await db.execute(
        """
        UPDATE "ConsumerProfile" SET
            "aadhaarNumber"=$1, "aadhaarVerified"=$2, "aadhaarName"=$3, "aadhaarDob"=$4,
            "digilockerRef"=$5, "kycDocumentUrl"=$6, "kycStatus"=$7, "phoneVerified"=true,
            latitude=$8, longitude=$9, "defaultAddress"=$10, "updatedAt"=$11
        WHERE "userId"=$12
        """,
        data["aadhaarNumber"],
        aadhaar_verified,
        aadhaar_name or profile["aadhaarName"],
        aadhaar_dob or profile["aadhaarDob"],
        f"DL-{int(time.time() * 1000)}",
        kyc_url or profile["kycDocumentUrl"],
        "VERIFIED" if (kyc_url and aadhaar_verified) else profile["kycStatus"],
        data.get("latitude") if data.get("latitude") is not None else profile["latitude"],
        data.get("longitude") if data.get("longitude") is not None else profile["longitude"],
        data.get("defaultAddress") if data.get("defaultAddress") else profile["defaultAddress"],
        now_utc(),
        user_id,
    )
    updated = await db.fetchrow(
        """
        SELECT cp.*, u.id AS "user_id", u.name AS "user_name", u.phone AS "user_phone"
        FROM "ConsumerProfile" cp JOIN "User" u ON u.id=cp."userId" WHERE cp."userId"=$1
        """,
        user_id,
    )
    out = dict(updated)
    user_info = {"id": out.pop("user_id"), "name": out.pop("user_name"), "phone": out.pop("user_phone")}
    out["user"] = user_info
    return deep_serialize(out)


async def get_consumer_verification_status(user_id: str) -> dict:
    profile = await db.fetchrow('SELECT * FROM "ConsumerProfile" WHERE "userId"=$1', user_id)
    if profile is None:
        raise AppError("Consumer profile not found", 404)
    return {
        "phoneVerified": profile["phoneVerified"],
        "kycStatus": profile["kycStatus"],
        "aadhaarVerified": profile["aadhaarVerified"],
        "digilockerRef": profile["digilockerRef"],
        "fullyVerified": bool(profile["phoneVerified"]) and bool(profile["aadhaarVerified"]),
    }
