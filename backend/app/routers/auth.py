from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import MessageResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/verify", response_model=MessageResponse)
async def verify_token(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Token is valid for user: {current_user['email']}"
    }

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user
