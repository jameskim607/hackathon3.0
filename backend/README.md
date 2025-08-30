# LMS Backend API

A FastAPI backend for the Learning Management System with JWT authentication and Supabase integration.

## Features

- JWT-based authentication (signup/login)
- Role-based access control (admin/teacher/student)
- Resource management for teachers
- Rating system for students
- Multi-language translation support
- Comprehensive search and filtering
- CORS middleware for frontend integration

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the backend directory with:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# JWT Configuration
SECRET_KEY=your_jwt_secret_key_change_in_production

# Server Configuration (optional)
HOST=0.0.0.0
PORT=8000
```

### 3. Database Setup

Ensure your Supabase database has the tables defined in `../database/schema.sql`.

### 4. Run the Server

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Authentication
- `POST /signup` - User registration
- `POST /login` - User authentication

### Resources
- `POST /resources` - Create new resource (teachers only)
- `GET /resources` - List and search resources

### Ratings
- `POST /ratings` - Create rating (students only)

### Translations
- `GET /translations/{resource_id}/{lang}` - Get resource translation

### Health
- `GET /health` - API health check

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation with Pydantic
- CORS configuration

## Database Schema

The backend expects the database schema defined in `../database/schema.sql` with the following tables:
- users
- resources
- ratings
- translations
- logs


