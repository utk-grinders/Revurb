from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List
from datetime import datetime

class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class HealthCheck(BaseModel):
    status: str
    version: str = "1.0.0"

class MessageResponse(BaseModel):
    message: str

# Notes models
class NoteCreate(BaseModel):
    type: Literal["voice", "text"]
    content: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class NoteResponse(BaseModel):
    id: str
    type: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    latitude: float
    longitude: float
    distance_meters: float
    created_at: datetime
    reply_count: int
    is_own: bool = False

class NoteDetail(BaseModel):
    id: str
    type: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    latitude: float
    longitude: float
    created_at: datetime
    replies: List["ReplyResponse"] = []

class ReplyCreate(BaseModel):
    type: Literal["voice", "text"]
    content: Optional[str] = None

class ReplyResponse(BaseModel):
    id: str
    type: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime

class MyNoteResponse(BaseModel):
    id: str
    anonymous_id: str
    type: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    latitude: float
    longitude: float
    created_at: datetime
    expires_at: datetime

# Settings models
class UserSettings(BaseModel):
    location_tracking: Literal["foreground", "background"] = "foreground"

class UserSettingsUpdate(BaseModel):
    location_tracking: Literal["foreground", "background"]

NoteDetail.model_rebuild()
