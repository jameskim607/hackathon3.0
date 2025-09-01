import os
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import asyncpg
import logging
from database import get_db_connection
from payment import payment_processor
from ai_translator import ai_translator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TransLearn LMS API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str = "student"
    country: str = "Kenya"
    language: str = "english"

class UserResponse(UserBase):
    id: int
    role: str
    country: str
    language: str
    is_verified: bool
    balance: float
    created_at: datetime

class ResourceBase(BaseModel):
    title: str
    description: str
    subject: str
    grade_level: str
    language: str
    tags: List[str] = []
    price: float = 0.0

class ResourceCreate(ResourceBase):
    file_url: Optional[str] = None
    file_type: Optional[str] = None

class ResourceResponse(ResourceBase):
    id: int
    teacher_id: int
    teacher_name: str
    file_url: Optional[str]
    file_type: Optional[str]
    average_rating: float = 0.0
    download_count: int = 0
    created_at: datetime

class RatingCreate(BaseModel):
    resource_id: int
    rating: int
    comment: Optional[str] = None

class PaymentRequest(BaseModel):
    amount: float
    currency: str = "KES"
    email: EmailStr
    phone: Optional[str] = None
    metadata: Optional[dict] = None

class TranslationRequest(BaseModel):
    resource_id: int
    target_language: str

# Utility functions
def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# API Routes
@app.get("/")
async def root():
    return {"message": "TransLearn LMS API", "version": "2.0.0"}

@app.post("/users/register")
async def register_user(user: UserCreate):
    conn = await get_db_connection()
    try:
        # Check if user exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", user.email
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Insert new user
        hashed_password = hash_password(user.password)
        user_id = await conn.fetchval("""
            INSERT INTO users (email, full_name, password_hash, role, phone, country, language)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        """, user.email, user.full_name, hashed_password, user.role, user.phone, user.country, user.language)
        
        return {"message": "User registered successfully", "user_id": user_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@app.post("/users/login")
async def login_user(email: str, password: str):
    conn = await get_db_connection()
    try:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1", email
        )
        
        if not user or not verify_password(password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Convert to dict and remove password
        user_dict = dict(user)
        user_dict.pop('password_hash')
        return user_dict
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@app.get("/resources")
async def get_resources(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    language: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = 1,
    limit: int = 20
):
    conn = await get_db_connection()
    try:
        # Build query
        query = """
            SELECT r.*, u.full_name as teacher_name,
                   (SELECT AVG(rating) FROM ratings WHERE resource_id = r.id) as average_rating
            FROM resources r
            JOIN users u ON r.teacher_id = u.id
            WHERE r.is_active = true
        """
        params = []
        param_count = 0
        
        if subject:
            param_count += 1
            query += f" AND r.subject = ${param_count}"
            params.append(subject)
        if grade_level:
            param_count += 1
            query += f" AND r.grade_level = ${param_count}"
            params.append(grade_level)
        if language:
            param_count += 1
            query += f" AND r.language = ${param_count}"
            params.append(language)
        if min_price is not None:
            param_count += 1
            query += f" AND r.price >= ${param_count}"
            params.append(min_price)
        if max_price is not None:
            param_count += 1
            query += f" AND r.price <= ${param_count}"
            params.append(max_price)
        
        query += " ORDER BY r.created_at DESC LIMIT $1 OFFSET $2"
        params.extend([limit, (page - 1) * limit])
        
        resources = await conn.fetch(query, *params)
        return {"resources": [dict(resource) for resource in resources], "page": page, "limit": limit}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@app.post("/resources/upload")
async def upload_resource(
    title: str = Form(...),
    description: str = Form(...),
    subject: str = Form(...),
    grade_level: str = Form(...),
    language: str = Form(...),
    price: float = Form(0.0),
    tags: str = Form("[]"),
    teacher_id: int = Form(...),
    file: Optional[UploadFile] = File(None)
):
    conn = await get_db_connection()
    try:
        # Check upload limit before proceeding
        limit_check = await conn.fetchrow("SELECT * FROM check_upload_limit($1)", teacher_id)
        if not limit_check or not limit_check['can_upload']:
            raise HTTPException(status_code=403, detail=limit_check['message'] if limit_check else "Upload limit reached")
        
        # Handle file upload (simplified)
        file_url = None
        file_type = None
        if file:
            # In production, upload to cloud storage like S3 or Cloudinary
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            filename = f"{uuid.uuid4()}.{file_extension}"
            file_url = f"/uploads/{filename}"
            file_type = file.content_type
        
        # Insert resource
        resource_id = await conn.fetchval("""
            INSERT INTO resources (teacher_id, title, description, subject, grade_level, 
                                 language, price, tags, file_url, file_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        """, teacher_id, title, description, subject, grade_level, language, price, tags, file_url, file_type)
        
        # Increment upload count after successful upload
        await conn.execute("SELECT increment_upload_count($1)", teacher_id)
        
        return {"message": "Resource uploaded successfully", "resource_id": resource_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@app.post("/payments/initiate")
async def initiate_payment(payment: PaymentRequest):
    try:
        result = await payment_processor.initiate_payment(
            amount=payment.amount,
            email=payment.email,
            phone=payment.phone,
            currency=payment.currency,
            metadata=payment.metadata
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/payments/verify/{transaction_id}")
async def verify_payment(transaction_id: str):
    try:
        result = await payment_processor.verify_payment(transaction_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =======================
# Subscription & Payment Management
# =======================
@app.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    try:
        plans = payment_processor.get_subscription_plans()
        return {"plans": plans}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/subscriptions/upgrade")
async def upgrade_subscription(plan_name: str, user_id: int, email: str, phone: Optional[str] = None):
    """Initiate subscription upgrade payment"""
    try:
        result = await payment_processor.initiate_subscription_payment(plan_name, email, user_id, phone)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/upload-limit")
async def check_user_upload_limit(user_id: int):
    """Check user's upload limit based on subscription using database function"""
    conn = await get_db_connection()
    try:
        # Use the database function to check upload limit
        result = await conn.fetchrow("SELECT * FROM check_upload_limit($1)", user_id)
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's subscription plan
        user = await conn.fetchrow("SELECT subscription_plan FROM users WHERE id = $1", user_id)
        subscription_plan = user.get('subscription_plan', 'free') if user else 'free'
        
        return {
            "user_id": user_id,
            "subscription_plan": subscription_plan,
            "can_upload": result['can_upload'],
            "current_uploads": result['current_uploads'],
            "upload_limit": result['upload_limit'],
            "remaining_uploads": result['remaining_uploads'],
            "message": result['message']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()

@app.post("/users/{user_id}/increment-upload")
async def increment_user_upload_count(user_id: int):
    """Increment user's upload count after successful upload"""
    conn = await get_db_connection()
    try:
        # Use the database function to increment upload count
        result = await conn.fetchval("SELECT increment_upload_count($1)", user_id)
        
        if result:
            return {"message": "Upload count incremented successfully", "can_upload": True}
        else:
            return {"message": "Upload limit reached", "can_upload": False}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()

# =======================
# AI Translation Services
# =======================
@app.post("/translate/text")
async def translate_text(text: str, target_language: str, source_language: str = "en"):
    """Translate text using AI"""
    try:
        if len(text) > 1000:
            raise HTTPException(status_code=400, detail="Text too long. Maximum 1000 characters allowed.")
        
        result = await ai_translator.translate_text(text, target_language, source_language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate/resource/{resource_id}")
async def translate_resource(resource_id: int, target_language: str, source_language: str = "en"):
    """Translate an entire educational resource"""
    try:
        result = await ai_translator.translate_resource(resource_id, target_language, source_language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/translate/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    try:
        languages = await ai_translator.get_supported_languages()
        return {"languages": languages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate/summary")
async def generate_summary(text: str, language: str = "en"):
    """Generate a summary of text"""
    try:
        if len(text) > 2000:
            raise HTTPException(status_code=400, detail="Text too long. Maximum 2000 characters allowed.")
        
        summary = await ai_translator.generate_summary(text, language)
        return {"summary": summary, "original_length": len(text), "summary_length": len(summary)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)