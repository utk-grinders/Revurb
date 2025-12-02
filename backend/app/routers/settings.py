from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from app.config import settings
from app.dependencies import get_current_user
from app.models import UserSettings, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@router.get("", response_model=UserSettings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    response = supabase.table("user_settings").select("*").eq(
        "user_id", current_user["id"]
    ).execute()
    
    if not response.data:
        return UserSettings(location_tracking="foreground")
    
    return UserSettings(location_tracking=response.data[0]["location_tracking"])

@router.put("", response_model=UserSettings)
async def update_settings(
    settings_update: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.table("user_settings").upsert({
        "user_id": current_user["id"],
        "location_tracking": settings_update.location_tracking,
        "updated_at": "now()"
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update settings")
    
    return UserSettings(location_tracking=response.data[0]["location_tracking"])




