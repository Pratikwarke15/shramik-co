from ..db import db
from ..errors import AppError
from ..utils import num, deep_serialize, now_utc


async def get_ministry_stats() -> dict:
    coop_count = await db.fetchval('SELECT COUNT(*) FROM "CoOp"')
    worker_count = await db.fetchval('SELECT COUNT(*) FROM "WorkerProfile"')
    pending_workers = await db.fetchval(
        'SELECT COUNT(*) FROM "WorkerProfile" WHERE status=$1', "PENDING_ADMIN_APPROVAL"
    )
    consumer_count = await db.fetchval(
        'SELECT COUNT(*) FROM "User" WHERE role=$1', "CONSUMER"
    )
    booking_count = await db.fetchval('SELECT COUNT(*) FROM "Booking"')
    revenue = await db.fetchrow(
        'SELECT COALESCE(SUM("commissionAmount"),0) AS total FROM "Booking"'
    )
    verified_workers = await db.fetchval(
        'SELECT COUNT(*) FROM "WorkerProfile" WHERE status=$1', "VERIFIED"
    )
    suspended_workers = await db.fetchval(
        'SELECT COUNT(*) FROM "WorkerProfile" WHERE status=$1', "SUSPENDED"
    )
    return {
        "totalCoops": coop_count,
        "totalWorkers": worker_count,
        "verifiedWorkers": verified_workers,
        "pendingWorkers": pending_workers,
        "suspendedWorkers": suspended_workers,
        "totalConsumers": consumer_count,
        "totalBookings": booking_count,
        "platformRevenue": num(revenue["total"]) if revenue is not None else 0,
    }


async def list_coops() -> list[dict]:
    coops = await db.fetch('SELECT * FROM "CoOp" ORDER BY "createdAt" ASC')
    result = []
    for c in coops:
        admin_row = await db.fetchrow(
            'SELECT u.id, u.name, u.phone FROM "CoopAdminProfile" cap '
            'JOIN "User" u ON u.id=cap."userId" WHERE cap."coopId"=$1',
            c["id"],
        )
        worker_count = await db.fetchval('SELECT COUNT(*) FROM "WorkerProfile" WHERE "coopId"=$1', c["id"])
        service_count = await db.fetchval('SELECT COUNT(*) FROM "Service" WHERE "coopId"=$1', c["id"])
        revenue_row = await db.fetchrow(
            'SELECT COALESCE(SUM(b."commissionAmount"),0) AS ca FROM "Booking" b '
            'JOIN "Service" s ON s.id=b."serviceId" WHERE s."coopId"=$1',
            c["id"],
        )
        result.append({
            "id": c["id"],
            "name": c["name"],
            "registrationNo": c["registrationNo"],
            "description": c["description"],
            "address": c["address"],
            "city": c["city"],
            "state": c["state"],
            "pincode": c["pincode"],
            "latitude": c["latitude"],
            "longitude": c["longitude"],
            "radiusKm": c["radiusKm"],
            "commissionRate": num(c["commissionRate"]),
            "isActive": c["isActive"],
            "createdAt": c["createdAt"],
            "admin": admin_row,
            "workerCount": worker_count,
            "serviceCount": service_count,
            "revenue": num(revenue_row["ca"]) if revenue_row is not None else 0,
        })
    return deep_serialize(result)


async def list_all_workers(status: str | None = None, q: str | None = None) -> list[dict]:
    conditions = []
    params = []
    if status and status != "ALL":
        params.append(status)
        conditions.append(f"wp.status=${len(params)}")
    if q:
        params.append(f"%{q}%")
        conditions.append(
            f"(u.name ILIKE ${len(params)} OR u.phone ILIKE ${len(params)} "
            f"OR wp.\"workAddress\" ILIKE ${len(params)})"
        )
    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = await db.fetch(
        f"""
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name", u.phone AS "user_phone",
               u."avatarUrl" AS "user_avatarUrl", u."createdAt" AS "user_createdAt",
               c.id AS "coop_id", c.name AS "coop_name", c.city AS "coop_city"
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id=wp."userId"
        LEFT JOIN "CoOp" c ON c.id=wp."coopId"
        {where}
        ORDER BY wp."createdAt" DESC
        """,
        *params,
    )
    result = []
    for w in rows:
        result.append({
            "id": w["id"],
            "userId": w["userId"],
            "name": w["user_name"],
            "phone": w["user_phone"],
            "avatarUrl": w["user_avatarUrl"],
            "joinedAt": w["user_createdAt"],
            "status": w["status"],
            "skillTags": w["skillTags"],
            "bio": w["bio"],
            "workAddress": w["workAddress"],
            "latitude": w["latitude"],
            "longitude": w["longitude"],
            "phoneVerified": w["phoneVerified"],
            "kycStatus": w["kycStatus"],
            "kycDocumentUrl": w["kycDocumentUrl"],
            "aadhaarVerified": w["aadhaarVerified"],
            "avgRating": w["avgRating"],
            "totalJobs": w["totalJobs"],
            "coop": (
                {"id": w["coop_id"], "name": w["coop_name"], "city": w["coop_city"]}
                if w["coop_id"] else None
            ),
        })
    return deep_serialize(result)


async def approve_worker_by_admin(worker_id: str, note: str | None = None) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    await db.execute(
        'UPDATE "WorkerProfile" SET status=$1, "kycStatus"=$2, "aadhaarVerified"=true, "updatedAt"=$3 WHERE id=$4',
        "VERIFIED", "VERIFIED", now_utc(), worker_id,
    )
    user = await db.fetchrow('SELECT id, name FROM "User" WHERE id=$1', profile["userId"])
    return {"id": worker_id, "name": user["name"] if user else None, "status": "VERIFIED"}


async def reject_worker_by_admin(worker_id: str, reason: str) -> dict:
    profile = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if profile is None:
        raise AppError("Worker profile not found", 404)
    await db.execute(
        'UPDATE "WorkerProfile" SET status=$1, "kycStatus"=$2, "updatedAt"=$3 WHERE id=$4',
        "SUSPENDED", "REJECTED", now_utc(), worker_id,
    )
    user = await db.fetchrow('SELECT id, name FROM "User" WHERE id=$1', profile["userId"])
    return {"id": worker_id, "name": user["name"] if user else None, "status": "SUSPENDED"}
