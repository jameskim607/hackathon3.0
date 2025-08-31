import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Create FastAPI app
app = FastAPI(title="Education Resources API", version="1.0.0")

# ===== CORS MIDDLEWARE =====
# Configure CORS to allow requests from your frontend
# Replace "https://your-frontend.vercel.app" with your actual frontend URL
origins = [
    "http://localhost:3000",  # For local development (React, Vite, Next.js)
    "http://localhost:5173",  # Common Vite dev server port
    "https://hackathon3-0-three.vercel.app",  # REPLACE WITH YOUR PRODUCTION FRONTEND URL
    # Add any other origins you need to allow (e.g., Netlify, GitHub Pages)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# ===== MODELS =====
class User(BaseModel):
    id: int
    name: str
    email: str

class Resource(BaseModel):
    id: int
    title: str
    description: str

class Rating(BaseModel):
    resource_id: int
    rating: int

class Translation(BaseModel):
    resource_id: int
    language: str
    text: str

class Log(BaseModel):
    user_id: int
    action: str


# ===== SAMPLE DATA =====
users_db = []
resources_db = []
ratings_db = {}
translations_db = {}
logs_db = {}


# ===== ROUTES =====

@app.get("/")
def root():
    return {"message": "Welcome to the Education Resources API!", "version": "1.0.0"}

# ---- Users ----
@app.get("/users")
def get_users():
    return {"users": users_db}

@app.post("/users")
def create_user(user: User):
    users_db.append(user.dict())
    return {"message": "User created successfully", "user": user}

# ---- Resources ----
@app.get("/resources")
def get_resources():
    return {"resources": resources_db}

@app.post("/resources")
def create_resource(resource: Resource):
    resources_db.append(resource.dict())
    return {"message": "Resource created successfully", "resource": resource}

# ---- Ratings ----
@app.post("/ratings")
def rate_resource(rating: Rating):
    if rating.resource_id not in ratings_db:
        ratings_db[rating.resource_id] = []
    ratings_db[rating.resource_id].append(rating.rating)
    return {"message": "Rating added", "ratings": ratings_db[rating.resource_id]}

@app.get("/ratings/{resource_id}")
def get_ratings(resource_id: int):
    return {"ratings": ratings_db.get(resource_id, [])}

# ---- Translations ----
@app.post("/translations")
def add_translation(translation: Translation):
    if translation.resource_id not in translations_db:
        translations_db[translation.resource_id] = []
    translations_db[translation.resource_id].append(translation.dict())
    return {"message": "Translation added", "translations": translations_db[translation.resource_id]}

@app.get("/translations/{resource_id}")
def get_translations(resource_id: int):
    return {"translations": translations_db.get(resource_id, [])}

# ---- Logs ----
@app.post("/logs")
def log_action(log: Log):
    if log.user_id not in logs_db:
        logs_db[log.user_id] = []
    logs_db[log.user_id].append(log.dict())
    return {"message": "Log saved", "logs": logs_db[log.user_id]}

@app.get("/logs/{user_id}")
def get_logs(user_id: int):
    return {"logs": logs_db.get(user_id, [])}

# ---- Health ----
@app.get("/health")
def health():
    return {"status": "ok"}


# ===== ENTRY POINT =====
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Railway injects PORT
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)