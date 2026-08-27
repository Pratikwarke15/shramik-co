import uuid
from datetime import datetime, timezone

from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import num, deep_serialize, now_utc


async def create_coop(data: dict) -> dict:
    existing = await db.fetchrow('SELECT * FROM "CoOp" WHERE "registrationNo"=$1', data["registrationNo"])
    if existing is not None:
        raise AppError("Registration number already exists", 409)
    commission_rate = min(data.get("commissionRate") if data.get("commissionRate") is not None else 5, 5)
    now = now_utc()
    coop_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO "CoOp" (id, name, "registrationNo", description, address, city, state, pincode,
            latitude, longitude, "radiusKm", "commissionRate", "maxCommissionRate", "isActive", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,5.00,true,$13,$13)
        """,
        coop_id, data["name"], data["registrationNo"], data.get("description"), data["address"],
        data["city"], data["state"], data["pincode"], data["latitude"], data["longitude"],
        data.get("radiusKm") if data.get("radiusKm") is not None else 10,
        commission_rate, now,
    )
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    return _format_coop(coop)


async def get_coop(coop_id: str) -> dict:
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    if coop is None:
        raise AppError("Co-op not found", 404)
    worker_count = await db.fetchval('SELECT COUNT(*) FROM "WorkerProfile" WHERE "coopId"=$1', coop_id)
    service_count = await db.fetchval('SELECT COUNT(*) FROM "Service" WHERE "coopId"=$1', coop_id)
    out = _format_coop(coop)
    out["workerCount"] = worker_count
    out["serviceCount"] = service_count
    return out


async def get_coop_by_admin(user_id: str) -> dict:
    admin = await db.fetchrow(
        'SELECT * FROM "CoopAdminProfile" WHERE "userId"=$1', user_id
    )
    if admin is None:
        raise AppError("No co-op found for this admin", 404)
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', admin["coopId"])
    if coop is None:
        raise AppError("No co-op found for this admin", 404)
    worker_count = await db.fetchval('SELECT COUNT(*) FROM "WorkerProfile" WHERE "coopId"=$1', coop["id"])
    service_count = await db.fetchval('SELECT COUNT(*) FROM "Service" WHERE "coopId"=$1', coop["id"])
    out = _format_coop(coop)
    out["workerCount"] = worker_count
    out["serviceCount"] = service_count
    return out


async def assert_coop_access(user_id: str, role: str, coop_id: str) -> None:
    if role == "MINISTRY_SUPER_ADMIN":
        return
    if role != "COOP_ADMIN":
        raise AppError("Insufficient permissions", 403)
    admin = await db.fetchrow(
        'SELECT "coopId" FROM "CoopAdminProfile" WHERE "userId"=$1', user_id
    )
    if admin is None or admin["coopId"] != coop_id:
        raise AppError("You can only manage your assigned co-op", 403)


async def list_services(coop_id: str | None = None, category: str | None = None) -> list[dict]:
    services = await db.fetch(
        """
        SELECT s.*, c.name AS "coop_name", c.city AS "coop_city", c.state AS "coop_state",
               c.latitude AS "coop_latitude", c.longitude AS "coop_longitude",
               c."radiusKm" AS "coop_radiusKm", c."commissionRate" AS "coop_commissionRate",
               c."maxCommissionRate" AS "coop_maxCommissionRate", c."isActive" AS "coop_isActive",
               c.id AS "coop_id"
        FROM "Service" s
        JOIN "CoOp" c ON c.id=s."coopId"
        WHERE s."isActive"=true AND c."isActive"=true
          AND ($1::text IS NULL OR s."coopId"=$1)
          AND ($2::text IS NULL OR s."categorySlug"=$2)
        ORDER BY s."categoryName" ASC, s.name ASC
        """,
        coop_id, category,
    )
    result = []
    for s in services:
        result.append({
            **dict(s),
            "basePrice": num(s["basePrice"]),
            "pricePerUnit": num(s["pricePerUnit"]),
            "minPrice": num(s["minPrice"]),
            "maxPrice": num(s["maxPrice"]),
            "coop": {
                "id": s["coop_id"], "name": s["coop_name"], "city": s["coop_city"],
                "state": s["coop_state"], "latitude": num(s["coop_latitude"]),
                "longitude": num(s["coop_longitude"]), "radiusKm": num(s["coop_radiusKm"]),
                "commissionRate": num(s["coop_commissionRate"]),
                "maxCommissionRate": num(s["coop_maxCommissionRate"]),
                "isActive": s["coop_isActive"],
            },
        })
    return deep_serialize(result)


async def get_coop_workers(coop_id: str, status: str | None = None) -> list[dict]:
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    if coop is None:
        raise AppError("Co-op not found", 404)
    status_cond = ""
    params = [coop_id]
    if status and status != "ALL":
        status_cond = " AND wp.status=$2"
        params.append(status)
    rows = await db.fetch(
        f"""
        SELECT wp.*, u.id AS "user_id", u.name AS "user_name", u.phone AS "user_phone",
               u."avatarUrl" AS "user_avatarUrl"
        FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId"
        WHERE wp."coopId"=$1{status_cond}
        ORDER BY wp."createdAt" DESC
        """,
        *params,
    )
    result = []
    for w in rows:
        out = dict(w)
        out["totalEarnings"] = num(w["totalEarnings"])
        out["walletBalance"] = num(w["walletBalance"])
        out["user"] = {"id": w["user_id"], "name": w["user_name"], "phone": w["user_phone"], "avatarUrl": w["user_avatarUrl"]}
        for k in ("user_id", "user_name", "user_phone", "user_avatarUrl"):
            out.pop(k, None)
        result.append(out)
    return deep_serialize(result)


async def update_coop_settings(coop_id: str, settings: dict) -> dict:
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    if coop is None:
        raise AppError("Co-op not found", 404)
    updates = []
    params = []
    if settings.get("radiusKm") is not None:
        updates.append('"radiusKm"=$' + str(len(params) + 1))
        params.append(settings["radiusKm"])
    if settings.get("commissionRate") is not None:
        updates.append('"commissionRate"=$' + str(len(params) + 1))
        params.append(min(settings["commissionRate"], 5))
    if settings.get("isActive") is not None:
        updates.append('"isActive"=$' + str(len(params) + 1))
        params.append(settings["isActive"])
    updates.append('"updatedAt"=$' + str(len(params) + 1))
    params.append(now_utc())
    params.append(coop_id)
    await db.execute(
        f'UPDATE "CoOp" SET {", ".join(updates)} WHERE id=${len(params)}',
        *params,
    )
    updated = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    return _format_coop(updated)


async def get_coop_dashboard(coop_id: str) -> dict:
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    if coop is None:
        raise AppError("Co-op not found", 404)

    now = now_utc()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    total_workers = await db.fetchval('SELECT COUNT(*) FROM "WorkerProfile" WHERE "coopId"=$1', coop_id)
    active_workers = await db.fetchval(
        'SELECT COUNT(*) FROM "WorkerProfile" WHERE "coopId"=$1 AND "isAvailable"=true AND "isOnDuty"=true',
        coop_id,
    )
    total_bookings = await db.fetchval(
        'SELECT COUNT(*) FROM "Booking" b JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE w."coopId"=$1',
        coop_id,
    )
    monthly_bookings = await db.fetchval(
        'SELECT COUNT(*) FROM "Booking" b JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE w."coopId"=$1 AND b."createdAt">=$2',
        coop_id, start_of_month,
    )
    completed = await db.fetch(
        'SELECT "finalPrice", "commissionAmount", "workerPayout", "completedAt" FROM "Booking" b '
        'JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE w."coopId"=$1 AND b.status=$2',
        coop_id, "COMPLETED",
    )
    total_rev = await db.fetchrow(
        'SELECT COALESCE(SUM(b."finalPrice"),0) AS fp, COALESCE(SUM(b."commissionAmount"),0) AS ca '
        'FROM "Booking" b JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE w."coopId"=$1 AND b.status=$2',
        coop_id, "COMPLETED",
    )
    monthly_rev = await db.fetchrow(
        'SELECT COALESCE(SUM(b."commissionAmount"),0) AS ca FROM "Booking" b '
        'JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE w."coopId"=$1 AND b.status=$2 AND b."completedAt">=$3',
        coop_id, "COMPLETED", start_of_month,
    )
    total_services = await db.fetchval(
        'SELECT COUNT(*) FROM "Service" WHERE "coopId"=$1 AND "isActive"=true', coop_id,
    )
    year_rev = sum(num(b["commissionAmount"]) or 0 for b in completed if b["completedAt"] and b["completedAt"] >= start_of_year)

    return {
        "coop": _format_coop(coop),
        "stats": {
            "totalWorkers": total_workers, "activeWorkers": active_workers,
            "totalBookings": total_bookings, "monthlyBookings": monthly_bookings,
            "completedBookings": len(completed),
            "totalRevenue": num(total_rev["fp"]) or 0,
            "totalCommission": num(total_rev["ca"]) or 0,
            "monthlyRevenue": num(monthly_rev["ca"]) or 0,
            "yearlyCommission": round(year_rev * 100) / 100,
            "totalServices": total_services,
        },
    }


def _format_coop(c: dict) -> dict:
    out = dict(c)
    out["commissionRate"] = num(c["commissionRate"])
    out["maxCommissionRate"] = num(c["maxCommissionRate"])
    return deep_serialize(out)
