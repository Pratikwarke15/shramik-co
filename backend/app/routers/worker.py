from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user, require_roles
from ..schemas import (
    RegisterWorkerRequest,
    UpdateWorkerLocationRequest,
    UpdateAvailabilityRequest,
)
from ..services import worker_service

router = APIRouter(tags=["workers"])


@router.post("/register")
async def register(
    body: RegisterWorkerRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    profile = await worker_service.register_worker(user["id"], body.model_dump())
    return {"success": True, "message": "Worker registered", "data": profile}


@router.patch("/location")
async def update_location(
    body: UpdateWorkerLocationRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.update_location(wp["id"], body.latitude, body.longitude)
    return {"success": True, "message": "Location updated", "data": profile}


@router.patch("/availability")
async def update_availability(
    body: UpdateAvailabilityRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.set_availability(wp["id"], body.isAvailable, body.isOnDuty)
    return {"success": True, "message": "Availability updated", "data": profile}


@router.get("/profile")
async def profile(user: dict = Depends(require_roles("WORKER"))):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.get_worker_profile(wp["id"])
    return {"success": True, "data": profile}


@router.get("/earnings")
async def earnings(user: dict = Depends(require_roles("WORKER"))):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    data = await worker_service.get_worker_earnings(wp["id"])
    return {"success": True, "data": data}


@router.get("/search")
async def search(
    lat: float = Query(..., description="latitude"),
    lng: float = Query(..., description="longitude"),
    radius: float = Query(10.0),
    skills: str | None = None,
    coopId: str | None = None,
):
    skill_list = None
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
    workers = await worker_service.search_workers(lat, lng, radius, skill_list, coopId)
    return {"success": True, "data": workers}


@router.get("/{worker_id}")
async def get_worker(worker_id: str):
    profile = await worker_service.get_worker_profile(worker_id)
    return {"success": True, "data": profile}
