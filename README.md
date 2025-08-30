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


