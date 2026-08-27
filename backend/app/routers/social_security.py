from fastapi import APIRouter, Depends

from ..deps import require_roles
from ..schemas import ToggleOptInRequest
from ..services import social_security_service, worker_service

router = APIRouter(tags=["social-security"])

WORKER = require_roles("WORKER")


@router.get("/contributions")
async def contributions(user: dict = Depends(WORKER)):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    data = await social_security_service.get_worker_contributions(wp["id"])
    return {"success": True, "data": data}


@router.patch("/opt-in")
async def opt_in(body: ToggleOptInRequest, user: dict = Depends(WORKER)):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    vault = await social_security_service.toggle_opt_in(wp["id"], body.fundType, body.optedIn)
    message = "Opted in" if body.optedIn else "Opted out"
    return {"success": True, "message": message, "data": vault}


@router.get("/history/{fund_type}")
async def history(fund_type: str, user: dict = Depends(WORKER)):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    data = await social_security_service.get_contribution_history(wp["id"], fund_type)
    return {"success": True, "data": data}
