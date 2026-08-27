import uuid

from datetime import datetime, timezone

from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import deep_serialize, now_utc

VALID_STATUSES = ("OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED", "CLOSED")


async def create_dispute(booking_id: str, raised_by: str, data: dict) -> dict:
    booking = await db.fetchrow(
        'SELECT b.*, w."coopId" AS "worker_coopId" FROM "Booking" b '
        'LEFT JOIN "WorkerProfile" w ON w.id=b."workerId" WHERE b.id=$1',
        booking_id,
    )
    if booking is None:
        raise AppError("Booking not found", 404)
    if booking["status"] == "CANCELLED":
        raise AppError("Cannot dispute a cancelled booking", 400)
    if booking["status"] == "DISPUTED":
        raise AppError("Booking already has an active dispute", 409)

    dispute_id = str(uuid.uuid4())
    now = now_utc()
    await db.execute(
        """
        INSERT INTO "Dispute" (id, "bookingId", "raisedBy", status, priority, category, description, evidence, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,'OPEN',$4,$5,$6,$7,$8,$8)
        """,
        dispute_id, booking_id, raised_by,
        data.get("priority") or "MEDIUM", data["category"], data["description"],
        data.get("evidence") or None, now,
    )
    await db.execute(
        'UPDATE "Booking" SET status=$1, "disputeId"=$2, "updatedAt"=$3 WHERE id=$4',
        "DISPUTED", dispute_id, now, booking_id,
    )
    dispute = await db.fetchrow('SELECT * FROM "Dispute" WHERE id=$1', dispute_id)
    return deep_serialize(dict(dispute))


async def get_dispute(dispute_id: str) -> dict:
    dispute = await db.fetchrow(
        """
        SELECT d.*, b."bookingRef", s.name AS "service_name", s."categoryName" AS "service_categoryName",
               w.name AS "worker_name", c.name AS "consumer_name"
        FROM "Dispute" d
        JOIN "Booking" b ON b.id=d."bookingId"
        JOIN "Service" s ON s.id=b."serviceId"
        LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
        LEFT JOIN "User" w ON w.id=wp."userId"
        JOIN "User" c ON c.id=b."consumerId"
        WHERE d.id=$1
        """,
        dispute_id,
    )
    if dispute is None:
        raise AppError("Dispute not found", 404)
    return deep_serialize(dict(dispute))


async def update_dispute_status(dispute_id: str, admin_id: str, status: str, resolution: str | None = None) -> dict:
    dispute = await db.fetchrow('SELECT * FROM "Dispute" WHERE id=$1', dispute_id)
    if dispute is None:
        raise AppError("Dispute not found", 404)
    if status not in VALID_STATUSES:
        raise AppError("Invalid dispute status", 400)
    if status == "RESOLVED" and not resolution:
        raise AppError("Resolution is required when resolving a dispute", 400)

    now = now_utc()
    update_sets = ['status=$1', '"resolvedBy"=$2']
    params = [status, admin_id]
    if resolution:
        update_sets.append('"resolution"=$%d' % (len(params) + 1))
        params.append(resolution)
    if status in ("RESOLVED", "CLOSED"):
        update_sets.append('"resolvedAt"=$%d' % (len(params) + 1))
        params.append(now)
    update_sets.append('"updatedAt"=$%d' % (len(params) + 1))
    params.append(now)
    params.append(dispute_id)
    await db.execute(
        f'UPDATE "Dispute" SET {", ".join(update_sets)} WHERE id=${len(params)}',
        *params,
    )
    if status in ("RESOLVED", "CLOSED"):
        await db.execute(
            'UPDATE "Booking" SET status=$1, "updatedAt"=$2 WHERE id=$3',
            "COMPLETED", now, dispute["bookingId"],
        )
    updated = await db.fetchrow('SELECT * FROM "Dispute" WHERE id=$1', dispute_id)
    return deep_serialize(dict(updated))


async def get_coop_disputes(coop_id: str, status: str | None = None) -> list[dict]:
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', coop_id)
    if coop is None:
        raise AppError("Co-op not found", 404)
    if status:
        rows = await db.fetch(
            """
            SELECT d.*, b.id AS "booking_id", b."bookingRef", b.status AS "booking_status", b.address AS "booking_address"
            FROM "Dispute" d
            JOIN "Booking" b ON b.id=d."bookingId"
            JOIN "WorkerProfile" w ON w.id=b."workerId"
            WHERE w."coopId"=$1 AND d.status=$2
            ORDER BY d."createdAt" DESC
            """,
            coop_id, status,
        )
    else:
        rows = await db.fetch(
            """
            SELECT d.*, b.id AS "booking_id", b."bookingRef", b.status AS "booking_status", b.address AS "booking_address"
            FROM "Dispute" d
            JOIN "Booking" b ON b.id=d."bookingId"
            JOIN "WorkerProfile" w ON w.id=b."workerId"
            WHERE w."coopId"=$1
            ORDER BY d."createdAt" DESC
            """,
            coop_id,
        )
    result = []
    for d in rows:
        out = dict(d)
        out["booking"] = {
            "id": d["booking_id"], "bookingRef": d["bookingRef"],
            "status": d["booking_status"], "address": d["booking_address"],
        }
        for k in ("booking_id", "bookingRef", "booking_status", "booking_address"):
            out.pop(k, None)
        result.append(out)
    return deep_serialize(result)
