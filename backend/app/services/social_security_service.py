import time
import uuid

from datetime import datetime, timezone

from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import num, deep_serialize, now_utc

FUND_TYPES = ("EMERGENCY_HEALTH", "INSURANCE", "WELFARE", "EDUCATION", "RETIREMENT")


async def _ensure_vaults(worker_id: str) -> list:
    vaults = await db.fetch('SELECT * FROM "SocialSecurityVault" WHERE "workerId"=$1', worker_id)
    if not vaults:
        now = now_utc()
        for ft in FUND_TYPES:
            await db.execute(
                """
                INSERT INTO "SocialSecurityVault" (id, "workerId", "fundType", "totalContributed",
                    "employerMatch", balance, "isOptedIn", "createdAt", "updatedAt")
                VALUES ($1,$2,$3,0,0,0,false,$4,$4)
                """,
                str(uuid.uuid4()), worker_id, ft, now,
            )
        vaults = await db.fetch('SELECT * FROM "SocialSecurityVault" WHERE "workerId"=$1', worker_id)
    return vaults


async def get_worker_contributions(worker_id: str) -> list[dict]:
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if worker is None:
        raise AppError("Worker profile not found", 404)
    vaults = await _ensure_vaults(worker_id)
    result = []
    for v in vaults:
        out = dict(v)
        out["totalContributed"] = num(v["totalContributed"])
        out["employerMatch"] = num(v["employerMatch"])
        out["balance"] = num(v["balance"])
        result.append(out)
    return deep_serialize(result)


async def toggle_opt_in(worker_id: str, fund_type: str, opted_in: bool) -> dict:
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if worker is None:
        raise AppError("Worker profile not found", 404)
    if fund_type not in FUND_TYPES:
        raise AppError("Invalid fund type", 400)

    vault = await db.fetchrow(
        'SELECT * FROM "SocialSecurityVault" WHERE "workerId"=$1 AND "fundType"=$2',
        worker_id, fund_type,
    )
    now = now_utc()
    if vault is None:
        vault_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO "SocialSecurityVault" (id, "workerId", "fundType", "totalContributed",
                "employerMatch", balance, "isOptedIn", "createdAt", "updatedAt")
            VALUES ($1,$2,$3,0,0,0,$4,$5,$5)
            """,
            vault_id, worker_id, fund_type, opted_in, now,
        )
    else:
        await db.execute(
            'UPDATE "SocialSecurityVault" SET "isOptedIn"=$1, "updatedAt"=$2 WHERE id=$3',
            opted_in, now, vault["id"],
        )
    vault = await db.fetchrow(
        'SELECT * FROM "SocialSecurityVault" WHERE "workerId"=$1 AND "fundType"=$2',
        worker_id, fund_type,
    )
    out = dict(vault)
    out["totalContributed"] = num(vault["totalContributed"])
    out["employerMatch"] = num(vault["employerMatch"])
    out["balance"] = num(vault["balance"])
    return deep_serialize(out)


async def get_contribution_history(worker_id: str, fund_type: str) -> dict:
    if fund_type not in FUND_TYPES:
        raise AppError("Invalid fund type", 400)
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if worker is None:
        raise AppError("Worker profile not found", 404)
    vault = await db.fetchrow(
        'SELECT * FROM "SocialSecurityVault" WHERE "workerId"=$1 AND "fundType"=$2',
        worker_id, fund_type,
    )
    if vault is None:
        raise AppError("No vault found for this fund type", 404)
    rows = await db.fetch(
        """
        SELECT t.*, b."bookingRef" FROM "WalletTransaction" t
        LEFT JOIN "Booking" b ON b.id=t."bookingId"
        WHERE t."workerId"=$1 AND t.type='SOCIAL_SECURITY_DEDUCTION' AND t.reference LIKE $2
        ORDER BY t."createdAt" DESC
        """,
        worker_id, f"%{fund_type}%",
    )
    transactions = [{
        **dict(t), "amount": num(t["amount"]), "balanceAfter": num(t["balanceAfter"]),
        "booking": {"id": None, "bookingRef": t.get("bookingRef")},
    } for t in rows]
    vault_out = dict(vault)
    vault_out["totalContributed"] = num(vault["totalContributed"])
    vault_out["employerMatch"] = num(vault["employerMatch"])
    vault_out["balance"] = num(vault["balance"])
    return deep_serialize({"vault": vault_out, "transactions": deep_serialize(transactions)})
