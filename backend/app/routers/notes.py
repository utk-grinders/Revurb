from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from supabase import create_client, Client
from app.config import settings
from app.dependencies import get_current_user
from app.models import (
    NoteCreate, NoteResponse, NoteDetail, ReplyCreate, ReplyResponse, MyNoteResponse
)
from typing import List, Optional
import uuid

router = APIRouter(prefix="/notes", tags=["Notes"])

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@router.get("/nearby", response_model=List[NoteResponse])
async def get_nearby_notes(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.rpc("get_nearby_notes", {
        "user_lat": lat,
        "user_lng": lng
    }).execute()
    
    notes = []
    for note in response.data or []:
        audio_url = None
        if note.get("audio_path"):
            audio_url = supabase.storage.from_("voice-notes").create_signed_url(
                note["audio_path"], 3600
            ).get("signedURL")
        
        notes.append(NoteResponse(
            id=note["id"],
            type=note["type"],
            content=note.get("content"),
            audio_url=audio_url,
            latitude=note["latitude"],
            longitude=note["longitude"],
            distance_meters=note["distance_meters"],
            created_at=note["created_at"],
            reply_count=note["reply_count"],
            is_own=False
        ))
    
    return notes

@router.get("/mine", response_model=List[MyNoteResponse])
async def get_my_notes(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    response = supabase.table("notes").select("*").eq(
        "user_id", current_user["id"]
    ).gt("expires_at", "now()").order("created_at", desc=True).execute()
    
    notes = []
    for note in response.data or []:
        audio_url = None
        if note.get("audio_path"):
            audio_url = supabase.storage.from_("voice-notes").create_signed_url(
                note["audio_path"], 3600
            ).get("signedURL")
        
        notes.append(MyNoteResponse(
            id=note["id"],
            anonymous_id=note["anonymous_id"],
            type=note["type"],
            content=note.get("content"),
            audio_url=audio_url,
            latitude=note["latitude"],
            longitude=note["longitude"],
            created_at=note["created_at"],
            expires_at=note["expires_at"]
        ))
    
    return notes

@router.post("", response_model=MyNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    content: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    # Check rate limit
    rate_check = supabase.rpc("check_rate_limit", {"p_user_id": current_user["id"]}).execute()
    if not rate_check.data:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Max 10 notes per hour."
        )
    
    # Validate input
    if type not in ["voice", "text"]:
        raise HTTPException(status_code=400, detail="Type must be 'voice' or 'text'")
    
    if type == "text" and not content:
        raise HTTPException(status_code=400, detail="Text notes require content")
    
    if type == "voice" and not audio:
        raise HTTPException(status_code=400, detail="Voice notes require audio file")
    
    audio_path = None
    if audio:
        file_ext = audio.filename.split(".")[-1] if audio.filename else "m4a"
        audio_path = f"{current_user['id']}/{uuid.uuid4()}.{file_ext}"
        
        file_content = await audio.read()
        supabase.storage.from_("voice-notes").upload(audio_path, file_content)
    
    # Create note with PostGIS location
    note_data = {
        "user_id": current_user["id"],
        "type": type,
        "content": content if type == "text" else None,
        "audio_path": audio_path,
        "latitude": latitude,
        "longitude": longitude,
        "location": f"POINT({longitude} {latitude})"
    }
    
    response = supabase.table("notes").insert(note_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create note")
    
    # Increment rate limit
    supabase.rpc("increment_rate_limit", {"p_user_id": current_user["id"]}).execute()
    
    note = response.data[0]
    audio_url = None
    if audio_path:
        audio_url = supabase.storage.from_("voice-notes").create_signed_url(
            audio_path, 3600
        ).get("signedURL")
    
    return MyNoteResponse(
        id=note["id"],
        anonymous_id=note["anonymous_id"],
        type=note["type"],
        content=note.get("content"),
        audio_url=audio_url,
        latitude=note["latitude"],
        longitude=note["longitude"],
        created_at=note["created_at"],
        expires_at=note["expires_at"]
    )

@router.get("/{note_id}", response_model=NoteDetail)
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    response = supabase.table("notes").select("*").eq("id", note_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = response.data[0]
    
    audio_url = None
    if note.get("audio_path"):
        audio_url = supabase.storage.from_("voice-notes").create_signed_url(
            note["audio_path"], 3600
        ).get("signedURL")
    
    # Get replies
    replies_response = supabase.table("replies").select("*").eq(
        "note_id", note_id
    ).order("created_at").execute()
    
    replies = []
    for reply in replies_response.data or []:
        reply_audio_url = None
        if reply.get("audio_path"):
            reply_audio_url = supabase.storage.from_("voice-notes").create_signed_url(
                reply["audio_path"], 3600
            ).get("signedURL")
        
        replies.append(ReplyResponse(
            id=reply["id"],
            type=reply["type"],
            content=reply.get("content"),
            audio_url=reply_audio_url,
            created_at=reply["created_at"]
        ))
    
    return NoteDetail(
        id=note["id"],
        type=note["type"],
        content=note.get("content"),
        audio_url=audio_url,
        latitude=note["latitude"],
        longitude=note["longitude"],
        created_at=note["created_at"],
        replies=replies
    )

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    # Get note to check ownership and get audio path
    response = supabase.table("notes").select("*").eq("id", note_id).eq(
        "user_id", current_user["id"]
    ).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Note not found or not owned by you")
    
    note = response.data[0]
    
    # Delete audio file if exists
    if note.get("audio_path"):
        supabase.storage.from_("voice-notes").remove([note["audio_path"]])
    
    # Delete note (cascades to replies)
    supabase.table("notes").delete().eq("id", note_id).execute()

@router.post("/{note_id}/replies", response_model=ReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    note_id: str,
    type: str = Form(...),
    content: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    # Check note exists
    note_check = supabase.table("notes").select("id").eq("id", note_id).execute()
    if not note_check.data:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if type not in ["voice", "text"]:
        raise HTTPException(status_code=400, detail="Type must be 'voice' or 'text'")
    
    if type == "text" and not content:
        raise HTTPException(status_code=400, detail="Text replies require content")
    
    if type == "voice" and not audio:
        raise HTTPException(status_code=400, detail="Voice replies require audio file")
    
    audio_path = None
    if audio:
        file_ext = audio.filename.split(".")[-1] if audio.filename else "m4a"
        audio_path = f"{current_user['id']}/replies/{uuid.uuid4()}.{file_ext}"
        
        file_content = await audio.read()
        supabase.storage.from_("voice-notes").upload(audio_path, file_content)
    
    reply_data = {
        "note_id": note_id,
        "user_id": current_user["id"],
        "type": type,
        "content": content if type == "text" else None,
        "audio_path": audio_path
    }
    
    response = supabase.table("replies").insert(reply_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create reply")
    
    reply = response.data[0]
    audio_url = None
    if audio_path:
        audio_url = supabase.storage.from_("voice-notes").create_signed_url(
            audio_path, 3600
        ).get("signedURL")
    
    return ReplyResponse(
        id=reply["id"],
        type=reply["type"],
        content=reply.get("content"),
        audio_url=audio_url,
        created_at=reply["created_at"]
    )




