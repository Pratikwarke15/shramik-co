import re
import time
import uuid
from datetime import datetime, timezone

from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import haversine_km, matches_skills, normalize_skill, worker_match_score, num, deep_serialize, now_utc



def _now_ts() -> str:
    return f"DL-{int(time.time() * 1000)}"


async def register_worker(user_id: str, data: dict) -> dict:
    existing = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE "userId"=$1', user_id)
    if existing is not None:
        raise AppError("Worker profile already exists", 409)

    coop_id = data.get("coopId")
    if coop_id:
        coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
        if coop is None:
            raise AppError("Co-op not found", 404)
    elif data.get("latitude") is not None and data.get("longitude") is not None:
        coops = await db.fetch('SELECT * FROM "CoOp" WHERE "isActive"=true')
        best = None
        for c in coops:
            d = haversine_km(
                data["latitude"], data["longitude"],
                num(c["latitude"]), num(c["longitude"]),
            )
            if d <= num_or(c["radiusKm"], 10) and (best is None or d < best[1]):
                best = (c["id"], d)
        coop_id = best[0] if best else None

    aadhaar_name = data.get("aadhaarName")
    aadhaar_dob = data.get("aadhaarDob")
    aadhaar_verified = bool(re.fullmatch(r"\d{12}", data["aadhaarNumber"]))
    now = now_utc()
    profile_id = str(uuid.uuid4())
    kyc_url = data.get("kycDocumentUrl")
    await db.execute(
        """
        INSERT INTO "WorkerProfile" (
            id, "userId", "skillTags", bio, "experienceYears", "coopId",
            latitude, longitude, "workAddress", "kycDocumentUrl", "kycStatus",
            "aadhaarNumber", "aadhaarVerified", "aadhaarName", "aadhaarDob",
            "digilockerRef", "phoneVerified", status, "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$18)
        """,
        profile_id,
        user_id,
        data.get("skillTags") or [],
        data.get("bio"),
        data.get("experienceYears") or 0,
        coop_id,
        data.get("latitude"),
        data.get("longitude"),
        data.get("workAddress"),
        kyc_url,
        "VERIFIED" if kyc_url else "UNDER_REVIEW",
        data["aadhaarNumber"],
        aadhaar_verified,
        aadhaar_name or data.get("aadhaarName"),
        aadhaar_dob,
        data.get("digilockerRef") or _now_ts(),
        "VERIFIED",
        now,
    )
    await db.execute('UPDATE "User" SET role=$1 WHERE id=$2', "WORKER", user_id)

    profile = await db.fetchrow(
        """
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name", u.phone AS "user_phone"
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id = wp."userId"
        WHERE wp.id=$1
        """,
        profile_id,
    )
    return _format_worker(profile)


async def get_worker_profile_by_user(user_id: str) -> dict:
    """Resolve the WorkerProfile for a user; 404 if the worker hasn't onboarded."""
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE "userId"=$1', user_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    return dict(profile)


async def update_location(worker_id: str, lat: float, lng: float) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    await db.execute(
        'UPDATE "WorkerProfile" SET latitude=$1, longitude=$2, "updatedAt"=$3 WHERE id=$4',
        lat, lng, now_utc(), worker_id,
    )
    updated = await db.fetchrow(
        """
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name"
        FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId" WHERE wp.id=$1
        """,
        worker_id,
    )
    return _format_worker(updated)


async def set_availability(worker_id: str, is_available: bool, is_on_duty: bool) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    if is_on_duty and profile["status"] != "VERIFIED":
        raise AppError("Worker must be approved before going on duty", 403)
    if is_on_duty and not is_available:
        raise AppError("Cannot be on duty if not available", 400)
    await db.execute(
        'UPDATE "WorkerProfile" SET "isAvailable"=$1, "isOnDuty"=$2, "updatedAt"=$3 WHERE id=$4',
        is_available, is_on_duty, now_utc(), worker_id,
    )
    updated = await db.fetchrow(
        """
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name"
        FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId" WHERE wp.id=$1
        """,
        worker_id,
    )
    return _format_worker(updated)


async def get_worker_profile(worker_id: str) -> dict:
    profile = await db.fetchrow(
        """
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name", u.phone AS "user_phone",
               u."avatarUrl" AS "user_avatarUrl", c.id AS "coop_id", c.name AS "coop_name"
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id=wp."userId"
        LEFT JOIN "CoOp" c ON c.id=wp."coopId"
        WHERE wp.id=$1
        """,
        worker_id,
    )
    if profile is None:
        raise AppError("Worker profile not found", 404)

    reviews = await db.fetch(
        """
        SELECT r.*, a.name AS "author_name", b.id AS "booking_id", b."bookingRef" AS "booking_bookingRef"
        FROM "Review" r
        JOIN "User" a ON a.id=r."authorId"
        JOIN "Booking" b ON b.id=r."bookingId"
        WHERE r."workerId"=$1
        ORDER BY r."createdAt" DESC LIMIT 10
        """,
        worker_id,
    )

    result = _format_worker(profile)
    result["user"] = {
        "id": profile["user_id"], "name": profile["user_name"],
        "phone": profile["user_phone"], "avatarUrl": profile["user_avatarUrl"],
    }
    result["coop"] = (
        {"id": profile["coop_id"], "name": profile["coop_name"]}
        if profile["coop_id"] else None
    )
    result["reviewsReceived"] = [{
        **dict(r),
        "author": {"id": r["author_name"] and dict(r)["authorId"], "name": r["author_name"]},
        "booking": {"id": r["booking_id"], "bookingRef": r["booking_bookingRef"]},
    } for r in reviews]
    return deep_serialize(result)


async def get_worker_earnings(worker_id: str) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)

    completed = await db.fetch(
        """
        SELECT b.id, b."bookingRef", b."finalPrice", b."workerPayout", b."completedAt",
               s.name AS "service_name", s."categoryName" AS "service_categoryName"
        FROM "Booking" b JOIN "Service" s ON s.id=b."serviceId"
        WHERE b."workerId"=$1 AND b.status='COMPLETED'
        ORDER BY b."completedAt" DESC
        """,
        worker_id,
    )
    transactions = await db.fetch(
        'SELECT * FROM "WalletTransaction" WHERE "workerId"=$1 ORDER BY "createdAt" DESC LIMIT 50',
        worker_id,
    )

    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly = sum(
        num(b["workerPayout"]) or 0
        for b in completed if b["completedAt"] and b["completedAt"] >= month_start
    )

    recent_bookings = []
    for b in completed[:10]:
        recent_bookings.append({
            "id": b["id"], "bookingRef": b["bookingRef"],
            "finalPrice": num(b["finalPrice"]) or 0, "workerPayout": num(b["workerPayout"]) or 0,
            "completedAt": b["completedAt"], "service": {"name": b["service_name"], "categoryName": b["service_categoryName"]},
        })
    recent_transactions = [
        {"id": t["id"], "type": t["type"], "amount": num(t["amount"]),
         "balanceAfter": num(t["balanceAfter"]), "description": t["description"],
         "createdAt": t["createdAt"]}
        for t in transactions[:20]
    ]
    return deep_serialize({
        "totalEarnings": num(profile["totalEarnings"]), "walletBalance": num(profile["walletBalance"]),
        "totalJobs": profile["totalJobs"], "avgRating": num(profile["avgRating"]),
        "monthlyEarnings": round(monthly * 100) / 100,
        "recentBookings": recent_bookings,
        "recentTransactions": recent_transactions,
    })


async def verify_worker(worker_id: str, aadhaar_number: str) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    if not re.fullmatch(r"\d{12}", aadhaar_number):
        raise AppError("Aadhaar verification failed: invalid number", 400)
    await db.execute(
        'UPDATE "WorkerProfile" SET status=$1, "kycStatus"=$2, "aadhaarVerified"=true, "digilockerRef"=$3, "updatedAt"=$4 WHERE id=$5',
        "VERIFIED", "VERIFIED", _now_ts(), now_utc(), worker_id,
    )
    updated = await db.fetchrow(
        'SELECT wp.*, u.id AS "user_id", u.name AS "user_name" FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId" WHERE wp.id=$1',
        worker_id,
    )
    return _format_worker(updated)


async def approve_worker(worker_id: str, coop_id: str, note: str | None = None) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    if profile["coopId"] and profile["coopId"] != coop_id:
        raise AppError("Worker does not belong to this co-op", 403)
    if profile["status"] in ("SUSPENDED", "DEACTIVATED"):
        raise AppError("Cannot approve a suspended/deactivated worker", 400)
    await db.execute(
        'UPDATE "WorkerProfile" SET status=$1, "kycStatus"=$2, "aadhaarVerified"=true, "updatedAt"=$3 WHERE id=$4',
        "VERIFIED", "VERIFIED", now_utc(), worker_id,
    )
    updated = await db.fetchrow(
        'SELECT wp.*, u.id AS "user_id", u.name AS "user_name" FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId" WHERE wp.id=$1',
        worker_id,
    )
    return _format_worker(updated)


async def reject_worker(worker_id: str, coop_id: str, reason: str) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    if profile["coopId"] and profile["coopId"] != coop_id:
        raise AppError("Worker does not belong to this co-op", 403)
    await db.execute(
        'UPDATE "WorkerProfile" SET status=$1, "kycStatus"=$2, "updatedAt"=$3 WHERE id=$4',
        "SUSPENDED", "REJECTED", now_utc(), worker_id,
    )
    updated = await db.fetchrow(
        'SELECT wp.*, u.id AS "user_id", u.name AS "user_name" FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId" WHERE wp.id=$1',
        worker_id,
    )
    return _format_worker(updated)


async def search_workers(lat: float, lng: float, radius_km: float,
                         skill_tags=None, coop_id: str | None = None) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT wp.*, u.name AS "user_name", c.name AS "coop_name"
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id=wp."userId"
        LEFT JOIN "CoOp" c ON c.id=wp."coopId"
        WHERE wp.status='VERIFIED' AND wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL
          AND u."isActive"=true
          AND ($1::text IS NULL OR wp."coopId"=$1)
        LIMIT 100
        """,
        coop_id,
    )
    result = []
    for w in rows:
        d = haversine_km(lat, lng, num(w["latitude"]), num(w["longitude"]))
        item = {
            "workerId": w["id"], "workerName": w["user_name"], "coopName": w["coop_name"] or None,
            "skillTags": w["skillTags"], "avgRating": num(w["avgRating"]), "totalJobs": w["totalJobs"],
            "bio": w["bio"], "experienceYears": w["experienceYears"],
            "isAvailable": w["isAvailable"], "isOnDuty": w["isOnDuty"],
            "distanceKm": round(d * 100) / 100,
        }
        if not matches_skills(w["skillTags"], skill_tags):
            continue
        if item["distanceKm"] > radius_km:
            continue
        item["etaMinutes"] = max(10, round(item["distanceKm"] * 5))
        item["matchScore"] = worker_match_score(item["avgRating"], item["totalJobs"], item["distanceKm"], radius_km)
        result.append(item)
    result.sort(key=lambda x: (-x["matchScore"], x["distanceKm"]))
    return deep_serialize(result[:100])


def _format_worker(w: dict) -> dict:
    out = dict(w)
    total_earnings = num(w.get("totalEarnings"))
    wallet = num(w.get("walletBalance"))
    if total_earnings is not None:
        out["totalEarnings"] = total_earnings
    if wallet is not None:
        out["walletBalance"] = wallet
    for key in ("user_id", "user_name", "user_phone", "user_avatarUrl", "coop_id", "coop_name"):
        out.pop(key, None)
    return deep_serialize(out)


def num_or(v, d=0):
    n = num(v)
    return d if n is None else n
