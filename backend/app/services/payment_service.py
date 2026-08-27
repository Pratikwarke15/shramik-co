import hashlib
import hmac
import time
import uuid

from datetime import datetime, timezone

from .. import config
from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import num, deep_serialize, now_utc


def _mock_order_id() -> str:
    return f"order_mock_{int(time.time() * 1000)}"


def _mock_vpa() -> str:
    return f"coopgig-{uuid.uuid4().hex[:8]}@upi"


def _mock_ref() -> str:
    return f"UPI-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6].upper()}"


async def create_order(amount_in_paise: int, receipt: str) -> dict:
    if (not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET) and not config.IS_PROD:
        return {
            "id": _mock_order_id(),
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
            "mock": True,
        }
    raise AppError("Razorpay not configured for real payments", 500)


async def create_order_for_booking(booking_id: str, consumer_id: str) -> dict:
    booking = await db.fetchrow(
        'SELECT * FROM "Booking" WHERE id=$1', booking_id,
    )
    if booking is None:
        raise AppError("Booking not found", 404)
    if booking["consumerId"] != consumer_id:
        raise AppError("You can only pay for your own bookings", 403)
    if booking["paymentStatus"] == "COMPLETED":
        raise AppError("Payment already completed", 409)

    amount = round(num(booking["finalPrice"] or booking["quotedPrice"]) * 100)
    order = await create_order(amount, booking["bookingRef"])
    if order and "id" in order:
        await db.execute(
            'UPDATE "Booking" SET "paymentRef"=$1, "updatedAt"=$2 WHERE id=$3',
            str(order["id"]), now_utc(), booking_id,
        )
    return order


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if (order_id.startswith("order_mock_") and payment_id.startswith("pay_mock_")
            and signature == "mock_signature" and not config.IS_PROD):
        return True
    secret = config.RAZORPAY_KEY_SECRET
    if not secret:
        return False
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def initiate_payment(booking_id: str, consumer_id: str | None = None) -> dict:
    booking = await db.fetchrow('SELECT * FROM "Booking" WHERE id=$1', booking_id)
    if booking is None:
        raise AppError("Booking not found", 404)
    if consumer_id and booking["consumerId"] != consumer_id:
        raise AppError("You can only initiate payment for your own booking", 403)
    if booking["paymentStatus"] not in ("PENDING", "FAILED"):
        raise AppError("Payment already initiated or completed", 409)

    commission_rate = min(num(booking["commissionRate"]), config.MAX_COMMISSION_RATE)
    final_price = booking["finalPrice"] if booking["finalPrice"] is not None else booking["quotedPrice"]
    final_price = num(final_price)
    commission_amount = final_price * (commission_rate / 100)
    worker_payout = final_price - commission_amount
    mock_vpa = _mock_vpa()
    payment_ref = _mock_ref()

    await db.execute(
        """
        UPDATE "Booking" SET "paymentStatus"=$1, "finalPrice"=$2, "commissionRate"=$3,
            "commissionAmount"=$4, "workerPayout"=$5, "paymentRef"=$6, "updatedAt"=$7
        WHERE id=$8
        """,
        "HELD_IN_ESCROW", final_price, commission_rate, commission_amount, worker_payout,
        payment_ref, now_utc(), booking_id,
    )
    return {
        "bookingId": booking["id"],
        "bookingRef": booking["bookingRef"],
        "amount": final_price,
        "commissionAmount": commission_amount,
        "workerPayout": worker_payout,
        "paymentRef": payment_ref,
        "mockVpa": mock_vpa,
        "status": "HELD_IN_ESCROW",
    }


async def confirm_payment(booking_id: str, payment_ref: str, consumer_id: str | None = None) -> dict:
    booking = await db.fetchrow('SELECT * FROM "Booking" WHERE id=$1', booking_id)
    if booking is None:
        raise AppError("Booking not found", 404)
    if consumer_id and booking["consumerId"] != consumer_id:
        raise AppError("You can only confirm payment for your own booking", 403)
    if booking["paymentStatus"] == "COMPLETED":
        raise AppError("Payment already confirmed", 409)
    if booking["paymentStatus"] != "HELD_IN_ESCROW":
        raise AppError("Payment must be in escrow before confirmation", 400)
    if not booking["workerId"]:
        raise AppError("No worker assigned to this booking", 400)

    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', booking["workerId"])
    if worker is None:
        raise AppError("Worker profile not found", 404)

    worker_payout = num(booking["workerPayout"]) or 0
    new_balance = num(worker["walletBalance"]) + worker_payout
    now = now_utc()
    tx_id = str(uuid.uuid4())

    await db.execute(
        'UPDATE "Booking" SET "paymentStatus"=$1, "paymentRef"=$2, "updatedAt"=$3 WHERE id=$4',
        "COMPLETED", payment_ref, now, booking_id,
    )
    await db.execute(
        'UPDATE "WorkerProfile" SET "walletBalance"=$1, "totalEarnings"=$2, "totalJobs"=$3, "updatedAt"=$4 WHERE id=$5',
        new_balance, num(worker["totalEarnings"]) + worker_payout, worker["totalJobs"] + 1, now, worker["id"],
    )
    await db.execute(
        """
        INSERT INTO "WalletTransaction" (id, "workerId", "bookingId", type, amount, "balanceAfter", description, reference, "createdAt")
        VALUES ($1,$2,$3,'PAYMENT',$4,$5,$6,$7,$8)
        """,
        tx_id, worker["id"], booking_id, worker_payout, new_balance,
        f"Payment for booking {booking['bookingRef']}", payment_ref, now,
    )
    return {
        "bookingId": booking["id"],
        "paymentStatus": "COMPLETED",
        "workerPayout": worker_payout,
        "transactionId": tx_id,
        "newBalance": new_balance,
    }


async def get_wallet_balance(worker_id: str) -> dict:
    worker = await db.fetchrow(
        'SELECT "walletBalance", "totalEarnings" FROM "WorkerProfile" WHERE id=$1', worker_id,
    )
    if worker is None:
        raise AppError("Worker profile not found", 404)
    return {
        "walletBalance": num(worker["walletBalance"]),
        "totalEarnings": num(worker["totalEarnings"]),
    }


async def get_transaction_history(worker_id: str, tx_type: str | None = None,
                                  page: int = 1, limit: int = 20) -> dict:
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE id=$1', worker_id)
    if worker is None:
        raise AppError("Worker profile not found", 404)
    page = page or 1
    limit = min(limit or 20, 100)
    skip = (page - 1) * limit

    if tx_type:
        rows = await db.fetch(
            'SELECT wt.*, b."bookingRef" FROM "WalletTransaction" wt '
            'LEFT JOIN "Booking" b ON b.id=wt."bookingId" '
            'WHERE wt."workerId"=$1 AND wt.type=$2 ORDER BY wt."createdAt" DESC LIMIT $3 OFFSET $4',
            worker_id, tx_type, limit, skip,
        )
        total = await db.fetchval(
            'SELECT COUNT(*) FROM "WalletTransaction" WHERE "workerId"=$1 AND type=$2',
            worker_id, tx_type,
        )
    else:
        rows = await db.fetch(
            'SELECT wt.*, b."bookingRef" FROM "WalletTransaction" wt '
            'LEFT JOIN "Booking" b ON b.id=wt."bookingId" '
            'WHERE wt."workerId"=$1 ORDER BY wt."createdAt" DESC LIMIT $2 OFFSET $3',
            worker_id, limit, skip,
        )
        total = await db.fetchval(
            'SELECT COUNT(*) FROM "WalletTransaction" WHERE "workerId"=$1', worker_id,
        )

    transactions = [{
        **dict(t), "amount": num(t["amount"]), "balanceAfter": num(t["balanceAfter"]),
        "booking": {"id": None, "bookingRef": t.get("bookingRef")},
    } for t in rows]
    return deep_serialize({"transactions": deep_serialize(transactions), "total": total, "page": page, "limit": limit})
