from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..deps import require_roles
from ..errors import AppError
from ..services import admin_service

router = APIRouter(tags=["admin"])

ADMIN = require_roles("MINISTRY_SUPER_ADMIN")


class ApproveRequest(BaseModel):
    note: str | None = None


class RejectRequest(BaseModel):
    reason: str


@router.get("/stats")
async def stats(user: dict = Depends(ADMIN)):
    data = await admin_service.get_ministry_stats()
    return {"success": True, "data": data}


@router.get("/coops")
async def list_coops(user: dict = Depends(ADMIN)):
    data = await admin_service.list_coops()
    return {"success": True, "data": data}


@router.get("/workers")
async def list_workers(status: str | None = None, q: str | None = None, user: dict = Depends(ADMIN)):
    data = await admin_service.list_all_workers(status, q)
    return {"success": True, "data": data}


@router.post("/workers/{worker_id}/approve")
async def approve_worker(worker_id: str, body: ApproveRequest, user: dict = Depends(ADMIN)):
    data = await admin_service.approve_worker_by_admin(worker_id, body.note)
    return {"success": True, "data": data}


@router.post("/workers/{worker_id}/reject")
async def reject_worker(worker_id: str, body: RejectRequest, user: dict = Depends(ADMIN)):
    if not body.reason or len(body.reason) < 3:
        raise AppError("Reason is required", 400)
    data = await admin_service.reject_worker_by_admin(worker_id, body.reason)
    return {"success": True, "data": data}
