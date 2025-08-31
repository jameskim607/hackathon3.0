from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Validate environment variables
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Education Resources API", version="1.0.0")

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Pydantic Models ==========
class UserCreate(BaseModel):
    role: str
    full_name: str
    email: str

class ResourceCreate(BaseModel):
    teacher_id: str
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[List[str]] = []
    file_url: Optional[str] = None

class RatingCreate(BaseModel):
    resource_id: str
    student_id: str
    rating: int
    feedback: Optional[str] = None

class TranslationCreate(BaseModel):
    resource_id: str
    target_language: str
    translated_text: str
    tts_url: Optional[str] = None
    summary: Optional[str] = None

class LogCreate(BaseModel):
    user_id: str
    action: str
    details: Optional[Dict] = {}

# Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to the Education Resources API!", "version": "1.0.0"}

# ========== USERS ==========
@app.get("/users")
def get_users():
    response = supabase.table("users").select("*").execute()
    return response.data

@app.post("/users")
def create_user(user: UserCreate):
    response = supabase.table("users").insert(user.dict()).execute()
    return response.data

# ========== RESOURCES ==========
@app.post("/resources")
def create_resource(resource: ResourceCreate):
    if not resource.teacher_id or not resource.title:
        raise HTTPException(status_code=400, detail="teacher_id and title are required")
    try:
        response = supabase.table("resources").insert(resource.dict()).execute()
        if response.data:
            return {"message": "Resource created successfully", "resource": response.data[0]}
        raise HTTPException(status_code=400, detail="Failed to create resource")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/resources")
def list_resources():
    try:
        response = supabase.table("resources").select("*").execute()
        return {"resources": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ========== RATINGS ==========
@app.post("/ratings")
def rate_resource(rating: RatingCreate):
    if rating.rating < 1 or rating.rating > 5:
        raise HTTPException(status_code=400, detail="rating must be between 1 and 5")
    try:
        response = supabase.table("ratings").insert(rating.dict()).execute()
        if response.data:
            return {"message": "Rating submitted successfully", "rating": response.data[0]}
        raise HTTPException(status_code=400, detail="Failed to submit rating")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/ratings/{resource_id}")
def get_ratings(resource_id: str):
    try:
        response = supabase.table("ratings").select("*").eq("resource_id", resource_id).execute()
        return {"ratings": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ========== TRANSLATIONS ==========
@app.post("/translations")
def add_translation(translation: TranslationCreate):
    try:
        response = supabase.table("translations").insert(translation.dict()).execute()
        if response.data:
            return {"message": "Translation added successfully", "translation": response.data[0]}
        raise HTTPException(status_code=400, detail="Failed to add translation")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/translations/{resource_id}")
def get_translations(resource_id: str):
    try:
        response = supabase.table("translations").select("*").eq("resource_id", resource_id).execute()
        return {"translations": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ========== LOGS ==========
@app.post("/logs")
def log_action(log: LogCreate):
    try:
        response = supabase.table("logs").insert(log.dict()).execute()
        if response.data:
            return {"message": "Log added successfully", "log": response.data[0]}
        raise HTTPException(status_code=400, detail="Failed to add log")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/logs/{user_id}")
def get_logs(user_id: str):
    try:
        response = supabase.table("logs").select("*").eq("user_id", user_id).execute()
        return {"logs": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Health check endpoint
@app.get("/health")
def health_check():
    try:
        supabase.table("users").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
