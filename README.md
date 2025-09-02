## TransLearn LMS

TransLearn is a multilingual Learning Management System (LMS) prototype that allows teachers to upload resources, students to discover and rate them, and the platform to generate translations and track activity. It includes subscription plans, payment tracking, and monthly upload limits. The stack is designed for quick iteration and cloud deployment.

### Hackathon One‑Pager (for judges and visitors)
Make this your first stop. Short, skimmable, and demo‑ready.

- Problem: Educational content is abundant but not accessible across languages, grade levels, and countries. Teachers lack simple tools to localize and track usage.
- Solution: TransLearn lets teachers upload once, auto‑translate, and distribute resources globally; students discover content by subject/grade/language and give feedback.
- Why now: AI translation and modern serverless infra make global learning content accessible, fast, and affordable.
- What’s built: End‑to‑end MVP with real DB schema, upload limits by plan, translation logging, ratings, and a resilient frontend with a CORS‑free proxy.

2‑Minute Live Demo
1) Sign up or log in on Vercel (proxy ensures zero CORS issues).
2) Search for resources by subject/grade; open cards and see details.
3) Upload a new resource (as a teacher) and watch the monthly upload counter update.
4) Rate a resource (as a student) and see feedback reflected.
5) Trigger a translation (stub/flow) and observe `translation_logs` entries.

What’s technically interesting
- Database‑first design with strict UUIDs, triggers, and indexes for scale and reliability.
- Clear business logic in SQL functions to enforce monthly plan limits atomically.
- Clean separation: Vercel frontend with an `/api` proxy → Railway backend → Supabase DB.
- Resilience patterns: health checks, graceful degradation to demo mode, and a proxy that eliminates CORS friction.

Judging Criteria Mapping
- Impact: Breaks language barriers for learning; supports low‑cost plans for global reach.
- Innovation: DB‑native metering of upload limits; translation audit trails; repo‑ready serverless proxy.
- Feasibility: Deployed end‑to‑end with supabase functions/policies and real cloud URLs.
- UX: Minimal clicks to sign up, search, upload, rate; modern, responsive UI patterns.
- Extensibility: Clear roadmap to plug in AI translation/provider billing/webhooks.

Roadmap (Post‑hackathon)
- Production AI translation (batch + streaming), quality scores, and human‑in‑the‑loop review.
- Payments: provider integration, webhooks → `payment_transactions`, plan activation in `subscription_plans`.
- Personalized recommendations and classroom cohorts.
- Teacher dashboards with analytics from `logs`.

Quick links
- Frontend (Vercel): `https://hackathon3-0-xi.vercel.app`
- Backend (Railway): `https://web-production-02449.up.railway.app`
- API via proxy: call `/api/...` from the frontend

### AI Project Prompt (copy-paste)
Use this prompt to quickly brief teammates, judges, or AI tools about the project.

"""
You are working on TransLearn, a multilingual Learning Management System.

High-level:
- Frontend: static site on Vercel using `frontend/script.js` to call the backend
- Backend: HTTP API on Railway, proxied via Vercel `/api/*` to avoid CORS
- Database: Supabase Postgres with UUID primary keys, triggers, functions, and RLS

Core features:
- Users (admin/teacher/student) with country and language
- Resources authored by teachers with subject, grade, tags, and file URL
- Ratings (1–5) and feedback from students
- Translations per language (text, optional TTS URL, summary)
- Activity logs for analytics/auditing
- Subscriptions and payment transactions (UUID-based)
- Monthly upload limits per user with SQL functions to check/increment

Important details:
- All FKs are UUID; do NOT use integer IDs
- SQL functions available: `reset_monthly_upload_counts()`, `check_upload_limit(uuid)`, `increment_upload_count(uuid)`
- Vercel proxy routes `/api/*` → Railway backend (set `BACKEND_URL`)
- If backend is unhealthy, the frontend can switch to demo mode

Tasks you might do:
- Add endpoints for subscriptions/payments and wire to Supabase tables
- Extend search and filtering for resources
- Integrate AI translation service and log to `translation_logs`
- Improve RLS policies and role-based access
- Harden CORS or auth as needed
"""

### Extended AI Project Prompt (detailed)
Copy-paste this longer prompt when you need a comprehensive, end-to-end description for proposals, hackathons, or advanced AI assistance.

"""
You are joining the TransLearn project, a multilingual Learning Management System (LMS) designed to help teachers create and share educational resources while enabling students to search, rate, and consume localized/translated content. The system emphasizes global reach (country/language), scalability, and clear data governance.

Architecture and Stack:
- Frontend: Static site (HTML/CSS/JS) hosted on Vercel. It uses a resilient `frontend/script.js` that performs backend health checks, handles auth flows, resource search/upload, and can fall back to a demo mode if the backend is down.
- Backend: HTTP API hosted on Railway. The Vercel app proxies all requests via `/api/*` to the backend (`BACKEND_URL`) to avoid CORS issues, so the browser always calls the same origin.
- Database: Supabase Postgres with UUID primary keys, rich indexing, update triggers, JSONB for logs/metadata, business logic functions (PL/pgSQL), and Row Level Security (RLS) policies.

Primary Use Cases:
1) Teachers upload resources with subject/grade/tags in a target country/language. Files are referenced by URL.
2) Students search by query/subject/grade, view and download resources, and provide ratings/feedback.
3) The platform supports translations (per language) including optional TTS URLs and summaries, recorded in `translations` and `translation_logs`.
4) Subscription plans with monthly upload limits: Free/Basic/Premium/Enterprise. Upload counters are tracked monthly per user with helper functions to check/increment limits.
5) Activity logging for auditing and analytics using a flexible JSONB `logs.details`.

Data Model (UUID-based):
- `users(id, role, full_name, email unique, country, language, created_at, updated_at, subscription_plan, subscription_expires_at)`
- `resources(id, teacher_id->users, title, description, subject, grade, country, language, tags[], file_url, created_at, updated_at)`
- `ratings(id, resource_id->resources, student_id->users, rating 1..5, feedback, created_at, updated_at, unique(resource_id, student_id))`
- `translations(id, resource_id->resources, target_language, translated_text, tts_url, summary, created_at, updated_at, unique(resource_id, target_language))`
- `logs(id, user_id->users nullable, action, details jsonb, created_at)`
- `payment_transactions(id, user_id->users, transaction_id unique, amount, currency, payment_method, payment_provider, status, metadata jsonb, timestamps)`
- `subscription_plans(id, user_id->users, plan_name, plan_type, amount, currency, status, starts_at, expires_at, payment_transaction_id, timestamps)`
- `user_upload_counts(id, user_id->users, month_year 'YYYY-MM', upload_count, upload_limit, timestamps, unique(user_id, month_year))`
- `translation_logs(id, user_id->users, resource_id->resources, source_language, target_language, text_length, translation_status, model_used, confidence_score, processing_time_ms, created_at)`

Business Logic Functions:
- `_default_limit_for_plan(plan)` → 3/15/50/200 depending on plan
- `reset_monthly_upload_counts()` → seeds current month rows in `user_upload_counts` if missing
- `check_upload_limit(user_id uuid)` → returns can_upload/current/limit/remaining/message
- `increment_upload_count(user_id uuid)` → increments counter atomically if under limit

Security and Access:
- RLS is enabled for subscription, payments, upload counts, and translation logs. Policies typically allow users to select/modify only where `user_id = auth.uid()`.
- API roles are granted execution rights to the functions needed by the application.

API Endpoints (representative; confirm with backend):
- Auth: `POST /users/register` (email, full_name, password, country?, language?, role?), `POST /users/login` (email, password)
- Users: `GET /users/:id/dashboard`
- Resources: `GET /resources?query&subject&grade`, `POST /resources/upload` (multipart)
- Ratings: `POST /resources/:id/ratings` (rating, feedback?)
- Translations: `GET /resources/:id/translations`, `POST /resources/:id/translations`
- Subscriptions/Payments: `GET /subscriptions`, `POST /subscriptions`, `GET /payments`

Frontend Integration Details:
- `API_BASE_URL` is `/api` on Vercel (proxy), otherwise direct Railway URL locally.
- Signup normalizes payload: maps `name`→`full_name`, sets defaults (role=student, country=Kenya, language=en), lowercases email, checks confirm password if present.
- Health checks and safe fetch patterns detect backend outages and either surface errors or enable demo mode.

Deployment:
- Vercel: includes `vercel.json` routing `/api/*` to a serverless proxy (`api/[...path].js`) and serving static files from `frontend/`. Set `BACKEND_URL` env to Railway URL.
- Railway: deploy the backend and ensure it accepts JSON and integrates with Supabase.
- Supabase: execute base schema and update migration, set RLS policies and function grants, and schedule `reset_monthly_upload_counts()` monthly.

Constraints and Considerations:
- All tables use UUID primary keys; avoid integer IDs.
- CORS is mitigated by the Vercel proxy; backend can still enable CORS for local dev.
- Indices on common filter columns support performance; JSONB fields in logs/metadata are flexible but should be used judiciously.
- Error handling should respond with consistent JSON, and proxy should relay status codes.

Suggested Next Steps:
- Implement robust auth (JWT/cookies) and role checks in backend.
- Expand resource search (tags, country, language filters) and pagination.
- Integrate AI translation pipeline and store results in `translations`/`translation_logs`.
- Build subscription billing flows with a payment provider webhook, writing to `payment_transactions` and `subscription_plans`.
- Add admin dashboards for moderation and analytics.
"""

### Live Services
- Backend (Railway): `https://web-production-02449.up.railway.app`
- Frontend (Vercel): `https://hackathon3-0-xi.vercel.app`
- Database (Supabase Postgres): Managed in Supabase dashboard

## Architecture
- Frontend: Static site (HTML/CSS/JS) in `frontend/`, deployed to Vercel
- Backend API: Node/HTTP (or similar) deployed to Railway, reachable via `API_BASE_URL`
- Database: Supabase Postgres (UUID primary keys), SQL triggers/functions, RLS policies

## Key Features
- Users with roles: admin, teacher, student
- Resource management: subject, grade, tags, country, language, file URL
- Ratings and feedback per resource
- Translations: per-language text, TTS URL, summary
- Activity logs for auditing/analytics
- Subscriptions and payment tracking (UUID-based)
- Monthly upload limits per user, functions to enforce/check limits

## Repository Layout
- `frontend/` – Client-side code (see `frontend/script.js`)
- `database/schema.sql` – Base schema for users, resources, ratings, translations, logs
- `database/update_schema.sql` – Add-on schema for subscriptions, payments, upload limits, logs
- `README.md` – This document

## Environment and Configuration
Update the frontend to point to your backend URL:

```js
// frontend/script.js
const API_BASE_URL = 'https://web-production-02449.up.railway.app';
```

If your backend URL changes (Railway), change this constant and redeploy the frontend.

## Database Schema (Supabase Postgres)

### Core Tables (UUID-based)
- `users`: `id uuid pk`, `role`, `full_name`, `email unique`, `country`, `language`, timestamps
- `resources`: `id uuid pk`, `teacher_id -> users.id`, `title`, `description`, `subject`, `grade`, `country`, `language`, `tags text[]`, `file_url`, timestamps
- `ratings`: `id uuid pk`, `resource_id`, `student_id`, `rating 1..5`, `feedback`, timestamps, unique `(resource_id, student_id)`
- `translations`: `id uuid pk`, `resource_id`, `target_language`, `translated_text`, `tts_url`, `summary`, timestamps, unique `(resource_id, target_language)`
- `logs`: `id uuid pk`, `user_id nullable`, `action`, `details jsonb`, `created_at`

All core tables have helpful indexes and an `update_updated_at_column()` trigger to maintain `updated_at` on change.

### Subscriptions, Payments, Upload Limits
Added by the migration you ran in Supabase:
- `users` extended with `subscription_plan` (default `free`) and `subscription_expires_at`
- `payment_transactions`: `id uuid pk`, `user_id uuid fk`, `transaction_id unique`, `amount`, `currency`, `payment_method`, `payment_provider`, `status`, `metadata jsonb`, timestamps
- `subscription_plans`: `id uuid pk`, `user_id fk`, `plan_name`, `plan_type`, `amount`, `currency`, `status`, `starts_at`, `expires_at`, optional `payment_transaction_id fk`, timestamps
- `user_upload_counts`: `id uuid pk`, `user_id fk`, `month_year 'YYYY-MM'`, `upload_count`, `upload_limit`, timestamps, unique `(user_id, month_year)`
- `translation_logs`: `id uuid pk`, `user_id fk`, `resource_id fk`, `source_language`, `target_language`, `text_length`, `translation_status`, `model_used`, `confidence_score`, `processing_time_ms`, `created_at`
- Triggers to update `updated_at` for the new tables

#### Helper and Business Logic Functions
- `_default_limit_for_plan(plan text) -> integer`: returns 3/15/50/200 for free/basic/premium/enterprise
- `reset_monthly_upload_counts()`: inserts current month rows into `user_upload_counts` for all users if missing
- `check_upload_limit(user_id uuid) -> (can_upload, current_uploads, upload_limit, remaining_uploads, message)`
- `increment_upload_count(user_id uuid) -> boolean`: increments count atomically if under limit

Run this once each month (e.g., 1st at 00:05):

```sql
select reset_monthly_upload_counts();
```

### RLS (Row Level Security)
Enable RLS and add per-user policies. Adjust to your auth model.

```sql
alter table subscription_plans enable row level security;
alter table payment_transactions enable row level security;
alter table user_upload_counts enable row level security;
alter table translation_logs enable row level security;

create policy "sp_select_own" on subscription_plans for select using (user_id = auth.uid());
create policy "sp_modify_own" on subscription_plans for all using (user_id = auth.uid());

create policy "pt_select_own" on payment_transactions for select using (user_id = auth.uid());
create policy "pt_modify_own" on payment_transactions for all using (user_id = auth.uid());

create policy "uuc_select_own" on user_upload_counts for select using (user_id = auth.uid());
create policy "uuc_modify_own" on user_upload_counts for all using (user_id = auth.uid());

create policy "tlogs_select_own" on translation_logs for select using (user_id = auth.uid());
create policy "tlogs_modify_own" on translation_logs for all using (user_id = auth.uid());
```

Grant function execution to your API roles:

```sql
grant execute on function check_upload_limit(uuid) to anon, authenticated, service_role;
grant execute on function increment_upload_count(uuid) to authenticated, service_role;
```

## Backend API

Base URL: `API_BASE_URL` (Railway). Expected endpoints (adapt to your implementation):

### Auth
- `POST /users/register` – Body JSON: `{ email, full_name, password, role?, country?, language? }`
- `POST /users/login` – Body JSON: `{ email, password }`

### Users
- `GET /users/:id/dashboard` – Stats, recommended resources, etc.

### Resources
- `GET /resources?query&subject&grade` – Search
- `POST /resources/upload` – Multipart form: resource fields + file

### Ratings
- `POST /resources/:id/ratings` – Body JSON: `{ rating, feedback? }`

### Translations
- `GET /resources/:id/translations` – List translations
- `POST /resources/:id/translations` – Create a translation (could trigger AI service)

### Subscriptions/Payments
- `GET /subscriptions` – Current user’s plans
- `POST /subscriptions` – Start/upgrade plan
- `GET /payments` – Payment transactions for current user

Your actual backend may differ—ensure the frontend integrates the exact paths/fields.

## CORS Configuration (Critical)

Because the frontend is on Vercel and the backend on Railway, the backend must allow the frontend origin:

- Allowed origin: `https://hackathon3-0-xi.vercel.app`
- Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
- Headers: `Content-Type, Authorization`
- Credentials: only if using cookies

Examples:

Express:
```js
import cors from 'cors';
app.use(cors({
  origin: 'https://hackathon3-0-xi.vercel.app',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());
```

NestJS:
```ts
app.enableCors({
  origin: 'https://hackathon3-0-xi.vercel.app',
  methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true
});
```

FastAPI:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hackathon3-0-xi.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

Bare Node http:
```js
res.setHeader('Access-Control-Allow-Origin', 'https://hackathon3-0-xi.vercel.app');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
```

Redeploy the backend after enabling CORS, then hard refresh your browser (Ctrl+F5).

## Frontend

The main script is `frontend/script.js`.

### Startup behavior
- Tests connectivity to the backend
- If backend is unhealthy, shows a status and can enable demo mode

### Auth flows
- Signup: normalizes payload, maps `name` to `full_name`, defaults `role=student`, `country=Kenya`, `language=en`, lowercases email, validates confirm password if present
- Login: posts JSON to `/users/login`

### Resources
- Search: uses query params
- Upload: posts `FormData` to `/resources/upload`

### Dashboard
- Loads via `/users/:id/dashboard` and populates metrics and recommended resources

## Local Development
1) Backend: run locally and enable CORS for `http://localhost:3000`
2) Frontend: serve the static files (e.g., `npx serve frontend`)
3) Database: connect to Supabase project, or run a local Postgres (optional)
4) Update `API_BASE_URL` in `frontend/script.js` to your local backend URL

## Deployment
- Frontend (Vercel): import repo, set project to serve `frontend/` artifacts
- Backend (Railway): deploy, set environment variables, enable CORS
- Database (Supabase): run `database/schema.sql` then the update migration; add RLS policies and function grants; create a scheduled job for monthly reset

## Troubleshooting
- CORS error: No `Access-Control-Allow-Origin` header – enable CORS in backend for the Vercel domain and redeploy
- 422 on signup: verify backend expects `{ email, full_name, password }` and accepts defaults for `role`, `country`, `language`; check response body for details
- 5xx or timeouts: check Railway logs, Supabase connectivity, and URL correctness
- UUID vs INTEGER: all new tables and functions use UUID; ensure backend models use `uuid` types

## Security Notes
- Use HTTPS for both frontend and backend
- If using JWT/cookies, limit origins and set `SameSite` and `Secure` as appropriate
- Apply principle of least privilege for database roles and API keys

## License
MIT (or your preferred license)

# Learning Management System (LMS)

A comprehensive Learning Management System with web frontend, FastAPI backend, PostgreSQL database, and USSD service for mobile access.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   USSD Service  │
                       │ (Africa's       │
                       │  Talking)       │
                       └─────────────────┘
```

## ✨ Features

### Core LMS Features
- **User Management**: Student, teacher, and admin roles
- **Resource Management**: Upload, search, and organize educational content
- **Multi-language Support**: Internationalization with AI translation options
- **Rating System**: Student feedback and resource evaluation
- **Advanced Search**: Filter by subject, grade, country, language, and tags

### Technical Features
- **JWT Authentication**: Secure user sessions
- **File Storage**: Supabase Storage integration
- **RESTful API**: Comprehensive backend endpoints
- **Responsive Design**: Mobile-first frontend
- **USSD Access**: Mobile phone access via Africa's Talking

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+ (for development)
- PostgreSQL 12+
- Supabase account

### 1. Clone and Setup
```bash
git clone <repository-url>
cd project
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb lms_db

# Run schema
psql -d lms_db -f database/schema.sql
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Supabase credentials

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend Setup
```bash
cd frontend

# Serve with any HTTP server
python -m http.server 8080
# or
npx serve .
```

### 5. USSD Service (Optional)
```bash
cd backend

# Install USSD dependencies
pip install -r ussd_requirements.txt

# Run USSD service
python ussd.py
```

## 📁 Project Structure

```
project/
├── database/
│   └── schema.sql              # Database schema and migrations
├── backend/
│   ├── main.py                 # Main FastAPI application
│   ├── ussd.py                 # USSD service for Africa's Talking
│   ├── requirements.txt        # Python dependencies
│   ├── ussd_requirements.txt   # USSD service dependencies
│   ├── README.md               # Backend documentation
│   └── ussd_README.md         # USSD service documentation
├── frontend/
│   ├── index.html              # Student portal
│   ├── upload.html             # Teacher dashboard
│   ├── login.html              # Authentication
│   ├── signup.html             # User registration
│   ├── styles.css              # Styling
│   ├── script.js               # Frontend logic
│   └── README.md               # Frontend documentation
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# JWT Configuration
SECRET_KEY=your_jwt_secret_key_change_in_production

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Africa's Talking (for USSD)
AT_API_KEY=your_at_api_key
AT_USERNAME=your_at_username

# AI Service (optional)
AI_SERVICE_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=your_openai_api_key
```

### Supabase Setup

1. **Create Project**: Sign up at [supabase.com](https://supabase.com)
2. **Database**: Use the provided schema in `database/schema.sql`
3. **Storage**: Create a `resources` bucket for file uploads
4. **API Keys**: Get your project URL and anon key

## 📚 API Documentation

### Authentication Endpoints
- `POST /signup` - User registration
- `POST /login` - User authentication

### Resource Endpoints
- `POST /resources/upload` - Upload educational resources
- `GET /resources` - List and search resources
- `GET /resources/{id}` - Get specific resource
- `GET /resources/{id}/ratings` - Get resource ratings

### Utility Endpoints
- `GET /subjects` - Available subjects
- `GET /grades` - Available grades
- `GET /countries` - Available countries
- `GET /languages` - Available languages

### USSD Endpoints
- `POST /ussd` - Africa's Talking USSD callback
- `GET /health` - Service health check
- `GET /sessions` - Active USSD sessions

## 🌐 Frontend Pages

### Student Portal (`index.html`)
- Resource search and filtering
- Resource browsing with grid/list views
- Language preferences and AI translation
- Responsive design for all devices

### Teacher Dashboard (`upload.html`)
- Resource upload form
- File drag-and-drop support
- Metadata management (title, description, tags)
- Upload progress tracking

### Authentication (`login.html`, `signup.html`)
- User login and registration
- Role-based access control
- Password strength validation
- Form validation and error handling

## 📱 USSD Service

The USSD service provides mobile access to educational resources:

- **Menu Navigation**: Browse by subject and grade
- **SMS Integration**: Request resource links via SMS
- **AI Summaries**: Get AI-generated content summaries
- **Session Management**: Maintains user state during interactions

### USSD Flow
```
*384*1234# → Main Menu → Browse Resources → Subject → Grade → Resources
```

## 🔒 Security Features

- **JWT Tokens**: Secure authentication
- **Password Hashing**: Bcrypt encryption
- **Input Validation**: Pydantic models
- **CORS Protection**: Cross-origin request handling
- **File Validation**: Type and size restrictions

## 🚀 Deployment

### Backend Deployment
```bash
# Production server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Docker
docker build -t lms-backend .
docker run -p 8000:8000 lms-backend
```

### Frontend Deployment
- Deploy to any static hosting service
- Configure backend API URL
- Enable HTTPS for production

### USSD Service
- Deploy to cloud server
- Configure Africa's Talking callback URL
- Set up monitoring and logging

## 🧪 Testing

### Backend Testing
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Frontend Testing
- Manual testing across browsers
- Mobile device testing
- Accessibility testing

### USSD Testing
```bash
# Test locally with ngrok
ngrok http 8001

# Use ngrok URL as callback in Africa's Talking
```

## 📊 Monitoring and Logging

- **Application Logs**: Structured logging with Python logging
- **Error Tracking**: Comprehensive error handling and reporting
- **Performance Monitoring**: API response time tracking
- **Health Checks**: Service availability monitoring

## 🔄 Development Workflow

1. **Database Changes**: Update `database/schema.sql`
2. **Backend Changes**: Modify `backend/main.py`
3. **Frontend Changes**: Update HTML, CSS, and JavaScript
4. **Testing**: Test all components locally
5. **Deployment**: Deploy to staging/production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the documentation in each component's README
2. Review the troubleshooting sections
3. Check the logs for error messages
4. Open an issue on GitHub

## 🔮 Future Enhancements

- **Real-time Features**: WebSocket support for live updates
- **Mobile App**: React Native or Flutter mobile application
- **Advanced Analytics**: Learning analytics and insights
- **AI Integration**: Content recommendations and personalization
- **Offline Support**: Progressive Web App features
- **Multi-tenant**: Support for multiple organizations
- **API Versioning**: Versioned API endpoints
- **Webhooks**: Integration with external services

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Africa's Talking API](https://africastalking.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [HTML5/CSS3/JavaScript Best Practices](https://developer.mozilla.org/)

---

**Built with ❤️ for education and learning**


