import uuid

from fastapi import APIRouter, Depends, File, UploadFile

from ..db import db
from ..deps import require_roles
from ..services import storage
from ..utils import now_utc

router = APIRouter(tags=["uploads"])

WORKER = require_roles("WORKER")
CONSUMER = require_roles("CONSUMER")
ANY_USER = require_roles("CONSUMER", "WORKER")

ALLOWED_KYC = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_PHOTO = {"image/jpeg", "image/png"}
KYC_LIMIT = 5 * 1024 * 1024
PHOTO_LIMIT = 2 * 1024 * 1024


async def _write_upload(user_id: str, bucket: str, purpose: str, file: UploadFile, data: bytes, result: dict):
    await db.execute(
        """
        INSERT INTO "FileUpload" (id, "userId", "fileName", "originalName", "mimeType", size, url, bucket, purpose, "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        """,
        uuid.uuid4().hex, user_id, result["path"],
        file.filename, file.content_type, len(data), result["url"], bucket, purpose,
        now_utc(),
    )


@router.post("/kyc")
async def upload_kyc(user: dict = Depends(WORKER), file: UploadFile = File(...)):
    if not file or file.content_type not in ALLOWED_KYC:
        return {"success": False, "error": "Only PDF, JPEG, or PNG files are allowed"}
    data = await file.read()
    if len(data) > KYC_LIMIT:
        return {"success": False, "error": "File exceeds 5MB limit"}
    result = await storage.upload_file("kyc-documents", data, file.filename or "file", file.content_type)
    await _write_upload(user["id"], "kyc-documents", "KYC", file, data, result)
    wp = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE "userId"=$1', user["id"])
    if wp is not None:
        await db.execute(
            'UPDATE "WorkerProfile" SET "kycDocumentUrl"=$1, "kycStatus"=$2, "updatedAt"=$3 WHERE id=$4',
            result["url"], "UNDER_REVIEW", now_utc(), wp["id"],
        )
    file_upload = await db.fetchrow('SELECT * FROM "FileUpload" WHERE "fileName"=$1', result["path"])
    return {"success": True, "data": {"url": result["url"], "fileUpload": {**dict(file_upload)}}}


@router.post("/consumer-kyc")
async def upload_consumer_kyc(user: dict = Depends(CONSUMER), file: UploadFile = File(...)):
    if not file or file.content_type not in ALLOWED_KYC:
        return {"success": False, "error": "Only PDF, JPEG, or PNG files are allowed"}
    data = await file.read()
    if len(data) > KYC_LIMIT:
        return {"success": False, "error": "File exceeds 5MB limit"}
    result = await storage.upload_file("kyc-documents", data, file.filename or "file", file.content_type)
    await _write_upload(user["id"], "kyc-documents", "KYC", file, data, result)
    await db.execute(
        'UPDATE "ConsumerProfile" SET "kycDocumentUrl"=$1, "kycStatus"=$2, "updatedAt"=$3 WHERE "userId"=$4',
        result["url"], "VERIFIED", now_utc(), user["id"],
    )
    file_upload = await db.fetchrow('SELECT * FROM "FileUpload" WHERE "fileName"=$1', result["path"])
    return {"success": True, "data": {"url": result["url"], "fileUpload": {**dict(file_upload)}}}


@router.post("/profile-photo")
async def upload_profile_photo(user: dict = Depends(ANY_USER), file: UploadFile = File(...)):
    if not file or file.content_type not in ALLOWED_PHOTO:
        return {"success": False, "error": "Only JPEG or PNG files are allowed"}
    data = await file.read()
    if len(data) > PHOTO_LIMIT:
        return {"success": False, "error": "File exceeds 2MB limit"}
    result = await storage.upload_file("profile-photos", data, file.filename or "file", file.content_type)
    await _write_upload(user["id"], "profile-photos", "PROFILE_PHOTO", file, data, result)
    await db.execute(
        'UPDATE "User" SET "avatarUrl"=$1, "updatedAt"=$2 WHERE id=$3',
        result["url"], now_utc(), user["id"],
    )
    file_upload = await db.fetchrow('SELECT * FROM "FileUpload" WHERE "fileName"=$1', result["path"])
    return {"success": True, "data": {"url": result["url"], "fileUpload": {**dict(file_upload)}}}
