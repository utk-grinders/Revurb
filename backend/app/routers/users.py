from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from app.config import settings
from app.dependencies import get_current_user
from app.models import UserProfile, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["Users"])

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    response = supabase.table("profiles").select("*").eq("id", current_user["id"]).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return response.data[0]

@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    update_data = profile_update.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    response = supabase.table("profiles").update(update_data).eq("id", current_user["id"]).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return response.data[0]
