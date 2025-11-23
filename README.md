# Revurb

Mobile app with Expo (React Native), FastAPI, and Supabase.

## Stack

- Frontend: Expo / React Native (JavaScript)
- Backend: FastAPI (Python)
- Database: Supabase (PostgreSQL)
- Auth: Google OAuth via Supabase

## Quick Run

**Backend:**
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```powershell
cd frontend
npx expo start
```

