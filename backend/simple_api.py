from fastapi import FastAPI
from supabase import create_client
import os
from dotenv import load_dotenv

# Load env file
load_dotenv()

# Get Supabase URL + Key
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello from FastAPI with Supabase!"}

@app.get("/users")
def get_users():
    response = supabase.table("users").select("*").execute()
    return response.data

