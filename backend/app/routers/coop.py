from fastapi import APIRouter, Depends, Query

from ..deps import require_roles
from ..schemas import (
    CreateCoopRequest,
    UpdateCoopSettingsRequest,
    ApproveWorkerRequest,
    RejectWorkerRequest,
)
from ..services import coop_service, dispute_service, worker_service

router = APIRouter(tags=["coops"])

ADMIN_ROLES = require_roles("COOP_ADMIN", "MINISTRY_SUPER_ADMIN")
MINISTRY = require_roles("MINISTRY_SUPER_ADMIN")


@router.post("/", status_code=201)
async def create(body: CreateCoopRequest, user: dict = Depends(MINISTRY)):
    coop = await coop_service.create_coop(body.model_dump())
    return {"success": True, "message": "Co-op created", "data": coop}


@router.get("/me")
async def me(user: dict = Depends(ADMIN_ROLES)):
    coop = await coop_service.get_coop_by_admin(user["id"])
    return {"success": True, "data": coop}


@router.get("/services")
async def services(coopId: str | None = None, category: str | None = None):
    service_list = await coop_service.list_services(coopId, category)
    return {"success": True, "data": service_list}


@router.get("/{coop_id}")
async def get_coop(coop_id: str):
    coop = await coop_service.get_coop(coop_id)
    return {"success": True, "data": coop}


@router.get("/{coop_id}/workers")
async def coop_workers(coop_id: str, status: str | None = None, user: dict = Depends(ADMIN_ROLES)):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    workers = await coop_service.get_coop_workers(coop_id, status)
    return {"success": True, "data": workers}


@router.get("/{coop_id}/dashboard")
async def coop_dashboard(coop_id: str, user: dict = Depends(ADMIN_ROLES)):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    dashboard = await coop_service.get_coop_dashboard(coop_id)
    return {"success": True, "data": dashboard}


@router.patch("/{coop_id}/settings")
async def update_settings(
    coop_id: str,
    body: UpdateCoopSettingsRequest,
    user: dict = Depends(ADMIN_ROLES),
):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    coop = await coop_service.update_coop_settings(coop_id, body.model_dump(exclude_none=True))
    return {"success": True, "message": "Settings updated", "data": coop}


@router.get("/{coop_id}/disputes")
async def coop_disputes(coop_id: str, status: str | None = None, user: dict = Depends(ADMIN_ROLES)):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    disputes = await dispute_service.get_coop_disputes(coop_id, status)
    return {"success": True, "data": disputes}


@router.post("/{coop_id}/workers/{worker_id}/approve")
async def approve_worker(
    coop_id: str, worker_id: str, body: ApproveWorkerRequest, user: dict = Depends(ADMIN_ROLES),
):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    worker = await worker_service.approve_worker(worker_id, coop_id, body.note)
    return {"success": True, "message": "Worker approved", "data": worker}


@router.post("/{coop_id}/workers/{worker_id}/reject")
async def reject_worker(
    coop_id: str, worker_id: str, body: RejectWorkerRequest, user: dict = Depends(ADMIN_ROLES),
):
    await coop_service.assert_coop_access(user["id"], user["role"], coop_id)
    worker = await worker_service.reject_worker(worker_id, coop_id, body.reason)
    return {"success": True, "message": "Worker rejected", "data": worker}
