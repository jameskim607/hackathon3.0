# LMS USSD Service

A USSD (Unstructured Supplementary Service Data) handler for Africa's Talking that allows users to browse educational resources via mobile phone dialing.

## Features

- **Menu Navigation**: Browse resources by subject and grade
- **SMS Integration**: Request SMS links to resources
- **AI Summaries**: Get AI-generated summaries of educational content
- **Session Management**: Maintains user session state during USSD interactions
- **Africa's Talking Integration**: Full compatibility with AT USSD API

## USSD Menu Flow

```
Main Menu
├── 1. Browse Resources
│   ├── Select Subject (Math, Science, English, History, Geography)
│   │   ├── Select Grade (K-5, 6-8, 9-12, College)
│   │   │   ├── Resource List
│   │   │   │   ├── 1. Request SMS Link
│   │   │   │   ├── 2. Get AI Summary
│   │   │   │   ├── 3. Browse More
│   │   │   │   └── 4. Back to Main
│   │   │   └── Back to Subjects
│   │   └── Back to Main
│   └── Back to Main
├── 2. Help
└── 3. Exit
```

## Setup

### 1. Install Dependencies

```bash
pip install -r ussd_requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```env
# Africa's Talking Configuration
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_africas_talking_username

# AI Service Configuration (Optional)
AI_SERVICE_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=your_openai_api_key

# Supabase Configuration (if integrating with main LMS)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Africa's Talking Setup

1. **Create Account**: Sign up at [Africa's Talking](https://africastalking.com/)
2. **Get API Key**: Retrieve your API key from the dashboard
3. **Create USSD Service**: 
   - Go to USSD section
   - Create new USSD service
   - Set callback URL: `https://your-domain.com/ussd`
   - Set service code (e.g., `*384*1234#`)

### 4. Run the Service

```bash
# Run directly
python ussd.py

# Or with uvicorn
uvicorn ussd:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### POST /ussd

Main USSD callback endpoint for Africa's Talking.

**Request Format:**
```json
{
    "sessionId": "string",
    "serviceCode": "string",
    "phoneNumber": "string",
    "text": "string"
}
```

**Response Format:**
```json
{
    "sessionId": "string",
    "serviceCode": "string",
    "phoneNumber": "string",
    "text": "string"
}
```

### GET /health

Health check endpoint.

### GET /sessions

Get current USSD sessions (for debugging).

### DELETE /sessions/{session_id}

Clear a specific USSD session.

## Configuration

### Menu Customization

Edit the `menu_structure` in the `USSDHandler` class to customize:

- Menu text and options
- Navigation flow
- Available subjects and grades

### SMS Integration

The service automatically sends SMS via Africa's Talking when users request resource links.

**SMS Format:**
```
LMS Resource: [Resource Title]

Access: [Resource URL]

Powered by LMS USSD
```

### AI Summary Integration

Currently uses mock summaries. To integrate with real AI services:

1. **OpenAI Integration**:
```python
def _get_ai_summary(self, resource: Dict) -> str:
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {AI_API_KEY}"},
        json={
            "model": "gpt-3.5-turbo",
            "messages": [{
                "role": "user", 
                "content": f"Summarize this educational resource: {resource['title']} - {resource['description']}"
            }]
        }
    )
    return response.json()["choices"][0]["message"]["content"]
```

2. **Hugging Face Integration**:
```python
def _get_ai_summary(self, resource: Dict) -> str:
    response = requests.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        headers={"Authorization": f"Bearer {AI_API_KEY}"},
        json={"inputs": f"{resource['title']} {resource['description']}"}
    )
    return response.json()[0]["summary_text"]
```

## Production Considerations

### 1. Session Management

Current implementation uses in-memory storage. For production:

```python
# Use Redis for session storage
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_session(session_id: str):
    session_data = redis_client.get(f"ussd_session:{session_id}")
    return json.loads(session_data) if session_data else {}

def save_session(session_id: str, session_data: dict):
    redis_client.setex(
        f"ussd_session:{session_id}", 
        3600,  # 1 hour expiry
        json.dumps(session_data)
    )
```

### 2. Database Integration

Replace mock resource fetching with real database queries:

```python
def _fetch_resources(self, subject: str, grade: str) -> List[Dict]:
    # Query your Supabase database
    response = supabase.table("resources").select("*").eq("subject", subject).eq("grade", grade).execute()
    return response.data
```

### 3. Error Handling

Implement comprehensive error handling:

```python
def process_ussd_request(self, request: USSDRequest) -> str:
    try:
        # Process request
        pass
    except DatabaseError:
        return "Service temporarily unavailable. Please try again later."
    except NetworkError:
        return "Network error. Please check your connection."
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return "An error occurred. Please try again."
```

### 4. Rate Limiting

Implement rate limiting to prevent abuse:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/ussd")
@limiter.limit("10/minute")
async def handle_ussd(request: USSDRequest):
    # Handle request
    pass
```

### 5. Logging and Monitoring

Enhanced logging for production:

```python
import structlog

logger = structlog.get_logger()

def process_ussd_request(self, request: USSDRequest) -> str:
    logger.info(
        "USSD request processed",
        session_id=request.sessionId,
        phone_number=request.phoneNumber,
        user_input=request.text,
        timestamp=datetime.utcnow().isoformat()
    )
```

## Testing

### 1. Local Testing

Use tools like ngrok to expose local server:

```bash
# Install ngrok
ngrok http 8001

# Use the ngrok URL as your callback URL in Africa's Talking
```

### 2. Test USSD Flow

1. Dial your USSD code (e.g., `*384*1234#`)
2. Navigate through menus
3. Test SMS functionality
4. Test AI summary generation

### 3. Mock Testing

Test without Africa's Talking:

```python
# Test request
test_request = USSDRequest(
    sessionId="test_session_123",
    serviceCode="*384*1234#",
    phoneNumber="+254700000000",
    text=""
)

response = ussd_service.process_ussd_request(test_request)
print(response)
```

## Troubleshooting

### Common Issues

1. **Callback URL Not Working**:
   - Ensure your server is accessible from the internet
   - Check firewall settings
   - Verify HTTPS certificate (if using HTTPS)

2. **SMS Not Sending**:
   - Verify Africa's Talking API credentials
   - Check account balance
   - Ensure phone number format is correct

3. **Session Issues**:
   - Check session storage implementation
   - Verify session expiry settings
   - Monitor memory usage

### Debug Endpoints

Use the debug endpoints to troubleshoot:

```bash
# Check current sessions
curl http://localhost:8001/sessions

# Clear a session
curl -X DELETE http://localhost:8001/sessions/session_id_here

# Health check
curl http://localhost:8001/health
```

## Security Considerations

1. **Input Validation**: All user input is validated and sanitized
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Session Security**: Use secure session management
4. **API Key Protection**: Store API keys securely in environment variables
5. **HTTPS**: Use HTTPS in production for secure communication

## Future Enhancements

1. **Multi-language Support**: Add support for local languages
2. **Payment Integration**: Allow resource purchases via USSD
3. **User Authentication**: Implement user registration and login
4. **Resource Recommendations**: AI-powered resource suggestions
5. **Offline Support**: Cache frequently accessed resources
6. **Analytics**: Track usage patterns and popular resources
7. **Integration**: Connect with other educational platforms

## Support

For issues and questions:

1. Check the logs for error messages
2. Verify Africa's Talking configuration
3. Test with the debug endpoints
4. Review the troubleshooting section above

## License

This project is part of the LMS system and follows the same licensing terms.


