from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from .. import config
from ..deps import require_roles
from ..services import payment_service, worker_service

router = APIRouter(tags=["payments"])

CONSUMER = require_roles("CONSUMER")
WORKER = require_roles("WORKER")


class InitiateRequest(BaseModel):
    bookingId: str


class ConfirmRequest(BaseModel):
    bookingId: str
    paymentRef: str


class CreateOrderRequest(BaseModel):
    amount: int | None = None
    receipt: str | None = None
    bookingId: str | None = None


class VerifyRequest(BaseModel):
    orderId: str
    paymentId: str
    signature: str
    bookingId: str | None = None


class VerifySignatureRequest(BaseModel):
    orderId: str
    paymentId: str
    signature: str


@router.post("/initiate")
async def initiate(body: InitiateRequest, user: dict = Depends(CONSUMER)):
    payment = await payment_service.initiate_payment(body.bookingId, user["id"])
    return {"success": True, "message": "Payment initiated", "data": payment}


@router.post("/confirm")
async def confirm(body: ConfirmRequest, user: dict = Depends(CONSUMER)):
    result = await payment_service.confirm_payment(body.bookingId, body.paymentRef, user["id"])
    return {"success": True, "message": "Payment confirmed", "data": result}


@router.get("/wallet")
async def wallet(user: dict = Depends(WORKER)):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    balance = await payment_service.get_wallet_balance(wp["id"])
    return {"success": True, "data": balance}


@router.get("/transactions")
async def transactions(
    type: str | None = None,
    page: int = Query(1),
    limit: int = Query(20),
    user: dict = Depends(WORKER),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    data = await payment_service.get_transaction_history(wp["id"], type, page, limit)
    return {"success": True, "data": data}


@router.post("/create-order")
async def create_order(body: CreateOrderRequest, user: dict = Depends(CONSUMER)):
    if body.bookingId:
        order = await payment_service.create_order_for_booking(body.bookingId, user["id"])
        return {"success": True, "data": order}
    if body.amount is None or body.receipt is None:
        return {"success": False, "error": "bookingId or amount (in paise) and receipt are required"}
    order = await payment_service.create_order(body.amount, body.receipt)
    return {"success": True, "data": order}


@router.post("/verify")
async def verify(body: VerifyRequest, user: dict = Depends(CONSUMER)):
    if not body.bookingId:
        return {"success": False, "error": "orderId, paymentId, signature, and bookingId are required"}
    valid = payment_service.verify_payment_signature(body.orderId, body.paymentId, body.signature)
    if not valid:
        return {"success": False, "error": "Invalid payment signature"}
    result = await payment_service.confirm_payment(body.bookingId, body.paymentId, user["id"])
    return {"success": True, "message": "Payment verified and confirmed", "data": result}


@router.get("/key")
async def key():
    key_id = config.RAZORPAY_KEY_ID
    if not key_id:
        if not config.IS_PROD:
            return {"success": True, "data": {"keyId": "rzp_test_mock_key", "mock": True}}
        return {"success": False, "error": "Razorpay key not configured"}
    return {"success": True, "data": {"keyId": key_id}}


@router.post("/verify-signature")
async def verify_signature(body: VerifySignatureRequest, user: dict = Depends(CONSUMER)):
    valid = payment_service.verify_payment_signature(body.orderId, body.paymentId, body.signature)
    if not valid:
        return {"success": False, "error": "Invalid payment signature"}
    return {"success": True, "valid": True, "message": "Signature verified"}
