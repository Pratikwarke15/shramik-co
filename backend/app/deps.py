from fastapi import Header, HTTPException
from fastapi.security.utils import get_authorization_scheme_param

from .security import verify_jwt, ExpiredTokenError, InvalidTokenError

VALID_ROLES = ("CONSUMER", "WORKER")


def get_current_user(authorization: str = Header(default="")) -> dict:
    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        payload = verify_jwt(token)
    except ExpiredTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def require_roles(*roles: str):
    from fastapi import Depends

    def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dep

