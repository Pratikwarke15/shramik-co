from fastapi import APIRouter, Depends

from ..deps import get_current_user, require_roles
from ..schemas import CreateDisputeRequest, UpdateDisputeStatusRequest
from ..services import dispute_service

router = APIRouter(tags=["disputes"])

ADMIN = require_roles("COOP_ADMIN", "MINISTRY_SUPER_ADMIN")


@router.post("/", status_code=201)
async def create(body: CreateDisputeRequest, user: dict = Depends(get_current_user)):
    dispute = await dispute_service.create_dispute(
        body.bookingId, user["id"],
        {"category": body.category, "description": body.description,
         "priority": body.priority, "evidence": body.evidence},
    )
    return {"success": True, "message": "Dispute created", "data": dispute}


@router.get("/{dispute_id}")
async def get(dispute_id: str, user: dict = Depends(get_current_user)):
    dispute = await dispute_service.get_dispute(dispute_id)
    return {"success": True, "data": dispute}


@router.patch("/{dispute_id}/status")
async def update_status(
    dispute_id: str,
    body: UpdateDisputeStatusRequest,
    user: dict = Depends(ADMIN),
):
    dispute = await dispute_service.update_dispute_status(
        dispute_id, user["id"], body.status, body.resolution,
    )
    return {"success": True, "message": "Dispute updated", "data": dispute}
