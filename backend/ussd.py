"""
USSD Handler for Africa's Talking
Provides educational resource browsing via USSD interface
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Africa's Talking USSD configuration
AT_API_KEY = os.getenv("AT_API_KEY", "your_at_api_key")
AT_USERNAME = os.getenv("AT_USERNAME", "your_at_username")
AT_SMS_URL = "https://api.africastalking.com/version1/messaging"

# AI Service configuration (you can integrate with OpenAI, Hugging Face, etc.)
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "https://api.openai.com/v1/chat/completions")
AI_API_KEY = os.getenv("AI_API_KEY", "your_ai_api_key")

# USSD Session Management (in production, use Redis or database)
ussd_sessions = {}

class USSDRequest(BaseModel):
    """Africa's Talking USSD request model"""
    sessionId: str
    serviceCode: str
    phoneNumber: str
    text: str

class USSDResponse(BaseModel):
    """Africa's Talking USSD response model"""
    sessionId: str
    serviceCode: str
    phoneNumber: str
    text: str

class SMSRequest(BaseModel):
    """SMS request model"""
    to: str
    message: str

class AIResponse(BaseModel):
    """AI service response model"""
    summary: str
    key_points: List[str]

class USSDHandler:
    """Handles USSD session state and navigation"""
    
    def __init__(self):
        self.menu_structure = {
            "main": {
                "text": "Welcome to LMS USSD\n\n1. Browse Resources\n2. Help\n3. Exit",
                "options": {
                    "1": "browse_subjects",
                    "2": "help",
                    "3": "exit"
                }
            },
            "browse_subjects": {
                "text": "Select Subject:\n\n1. Mathematics\n2. Science\n3. English\n4. History\n5. Geography\n6. Back",
                "options": {
                    "1": "Mathematics",
                    "2": "Science", 
                    "3": "English",
                    "4": "History",
                    "5": "Geography",
                    "6": "main"
                }
            },
            "browse_grades": {
                "text": "Select Grade:\n\n1. K-5 (Elementary)\n2. 6-8 (Middle)\n3. 9-12 (High)\n4. College\n5. Back",
                "options": {
                    "1": "K-5",
                    "2": "6-8",
                    "3": "9-12", 
                    "4": "college",
                    "5": "browse_subjects"
                }
            },
            "resource_list": {
                "text": "Resources found:\n\n{resources}\n\n1. Request SMS Link\n2. Get AI Summary\n3. Browse More\n4. Back to Main",
                "options": {
                    "1": "request_sms",
                    "2": "get_ai_summary",
                    "3": "browse_subjects",
                    "4": "main"
                }
            },
            "help": {
                "text": "LMS USSD Help:\n\n• Browse educational resources\n• Request SMS links\n• Get AI summaries\n\nDial *384*1234# to start",
                "options": {
                    "*": "main"
                }
            }
        }
    
    def get_menu(self, menu_name: str, **kwargs) -> str:
        """Get menu text with optional formatting"""
        menu = self.menu_structure.get(menu_name, self.menu_structure["main"])
        text = menu["text"]
        
        if menu_name == "resource_list" and "resources" in kwargs:
            text = text.format(resources=kwargs["resources"])
        
        return text
    
    def get_option_handler(self, menu_name: str, selection: str) -> str:
        """Get the handler for a menu selection"""
        menu = self.menu_structure.get(menu_name, self.menu_structure["main"])
        return menu["options"].get(selection, "main")

class USSDService:
    """Core USSD service logic"""
    
    def __init__(self):
        self.handler = USSDHandler()
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
    
    def process_ussd_request(self, request: USSDRequest) -> str:
        """Process USSD request and return response text"""
        try:
            session_id = request.sessionId
            user_input = request.text.strip()
            
            # Get or create session
            session = ussd_sessions.get(session_id, {
                "state": "main",
                "subject": None,
                "grade": None,
                "resources": [],
                "current_resource": None
            })
            
            # Handle user input
            if not user_input:
                # First time user - show main menu
                response_text = self.handler.get_menu("main")
                session["state"] = "main"
            else:
                response_text = self._handle_user_input(session, user_input)
            
            # Update session
            ussd_sessions[session_id] = session
            
            return response_text
            
        except Exception as e:
            logger.error(f"Error processing USSD request: {e}")
            return "Sorry, an error occurred. Please try again."
    
    def _handle_user_input(self, session: Dict, user_input: str) -> str:
        """Handle user input based on current state"""
        current_state = session["state"]
        
        if current_state == "main":
            return self._handle_main_menu(session, user_input)
        elif current_state == "browse_subjects":
            return self._handle_subject_selection(session, user_input)
        elif current_state == "browse_grades":
            return self._handle_grade_selection(session, user_input)
        elif current_state == "resource_list":
            return self._handle_resource_options(session, user_input)
        elif current_state == "request_sms":
            return self._handle_sms_request(session, user_input)
        elif current_state == "get_ai_summary":
            return self._handle_ai_summary(session, user_input)
        else:
            session["state"] = "main"
            return self.handler.get_menu("main")
    
    def _handle_main_menu(self, session: Dict, selection: str) -> str:
        """Handle main menu selection"""
        if selection == "1":
            session["state"] = "browse_subjects"
            return self.handler.get_menu("browse_subjects")
        elif selection == "2":
            session["state"] = "help"
            return self.handler.get_menu("help")
        elif selection == "3":
            session["state"] = "exit"
            return "Thank you for using LMS USSD. Goodbye!"
        else:
            return "Invalid selection. Please try again.\n\n" + self.handler.get_menu("main")
    
    def _handle_subject_selection(self, session: Dict, selection: str) -> str:
        """Handle subject selection"""
        if selection == "6":
            session["state"] = "main"
            return self.handler.get_menu("main")
        
        subject = self.handler.get_option_handler("browse_subjects", selection)
        if subject in ["Mathematics", "Science", "English", "History", "Geography"]:
            session["subject"] = subject
            session["state"] = "browse_grades"
            return self.handler.get_menu("browse_grades")
        else:
            return "Invalid selection. Please try again.\n\n" + self.handler.get_menu("browse_subjects")
    
    def _handle_grade_selection(self, session: Dict, selection: str) -> str:
        """Handle grade selection"""
        if selection == "5":
            session["state"] = "browse_subjects"
            return self.handler.get_menu("browse_subjects")
        
        grade = self.handler.get_option_handler("browse_grades", selection)
        if grade in ["K-5", "6-8", "9-12", "college"]:
            session["grade"] = grade
            # Fetch resources
            resources = self._fetch_resources(session["subject"], session["grade"])
            session["resources"] = resources
            session["state"] = "resource_list"
            
            if not resources:
                return f"No resources found for {session['subject']} - {session['grade']}\n\n1. Try different subject/grade\n2. Back to main",
            
            # Format resources for display
            resources_text = self._format_resources_for_ussd(resources)
            return self.handler.get_menu("resource_list", resources=resources_text)
        else:
            return "Invalid selection. Please try again.\n\n" + self.handler.get_menu("browse_grades")
    
    def _handle_resource_options(self, session: Dict, selection: str) -> str:
        """Handle resource list options"""
        if selection == "1":
            session["state"] = "request_sms"
            return "Enter the resource number (1-{}) to receive SMS link:".format(len(session["resources"]))
        elif selection == "2":
            session["state"] = "get_ai_summary"
            return "Enter the resource number (1-{}) to get AI summary:".format(len(session["resources"]))
        elif selection == "3":
            session["state"] = "browse_subjects"
            return self.handler.get_menu("browse_subjects")
        elif selection == "4":
            session["state"] = "main"
            return self.handler.get_menu("main")
        else:
            return "Invalid selection. Please try again.\n\n" + self._get_resource_list_text(session)
    
    def _handle_sms_request(self, session: Dict, user_input: str) -> str:
        """Handle SMS link request"""
        try:
            resource_index = int(user_input) - 1
            if 0 <= resource_index < len(session["resources"]):
                resource = session["resources"][resource_index]
                phone_number = session.get("phone_number", "unknown")
                
                # Send SMS with resource link
                success = self._send_sms_link(phone_number, resource)
                
                if success:
                    session["state"] = "resource_list"
                    return f"SMS sent with link to: {resource['title']}\n\n" + self._get_resource_list_text(session)
                else:
                    session["state"] = "resource_list"
                    return "Failed to send SMS. Please try again.\n\n" + self._get_resource_list_text(session)
            else:
                return "Invalid resource number. Please try again."
        except ValueError:
            return "Please enter a valid number."
    
    def _handle_ai_summary(self, session: Dict, user_input: str) -> str:
        """Handle AI summary request"""
        try:
            resource_index = int(user_input) - 1
            if 0 <= resource_index < len(session["resources"]):
                resource = session["resources"][resource_index]
                
                # Get AI summary
                summary = self._get_ai_summary(resource)
                
                session["state"] = "resource_list"
                return f"AI Summary for {resource['title']}:\n\n{summary}\n\n" + self._get_resource_list_text(session)
            else:
                return "Invalid resource number. Please try again."
        except ValueError:
            return "Please enter a valid number."
    
    def _fetch_resources(self, subject: str, grade: str) -> List[Dict]:
        """Fetch resources from Supabase based on subject and grade"""
        try:
            # This would typically call your Supabase API
            # For now, return mock data
            mock_resources = [
                {
                    "id": "1",
                    "title": f"{subject} Basics for {grade}",
                    "description": f"Fundamental concepts in {subject} for {grade} level students",
                    "file_url": "https://example.com/resource1.pdf",
                    "subject": subject,
                    "grade": grade
                },
                {
                    "id": "2", 
                    "title": f"{subject} Advanced Topics - {grade}",
                    "description": f"Advanced {subject} topics suitable for {grade} students",
                    "file_url": "https://example.com/resource2.pdf",
                    "subject": subject,
                    "grade": grade
                }
            ]
            return mock_resources
        except Exception as e:
            logger.error(f"Error fetching resources: {e}")
            return []
    
    def _format_resources_for_ussd(self, resources: List[Dict]) -> str:
        """Format resources for USSD display"""
        if not resources:
            return "No resources found."
        
        formatted = ""
        for i, resource in enumerate(resources[:5], 1):  # Limit to 5 resources for USSD
            title = resource["title"][:40] + "..." if len(resource["title"]) > 40 else resource["title"]
            formatted += f"{i}. {title}\n"
        
        if len(resources) > 5:
            formatted += f"... and {len(resources) - 5} more resources"
        
        return formatted
    
    def _get_resource_list_text(self, session: Dict) -> str:
        """Get formatted resource list text"""
        resources_text = self._format_resources_for_ussd(session["resources"])
        return self.handler.get_menu("resource_list", resources=resources_text)
    
    def _send_sms_link(self, phone_number: str, resource: Dict) -> bool:
        """Send SMS with resource link via Africa's Talking"""
        try:
            message = f"LMS Resource: {resource['title']}\n\nAccess: {resource['file_url']}\n\nPowered by LMS USSD"
            
            headers = {
                "apiKey": AT_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
            
            data = {
                "username": AT_USERNAME,
                "to": phone_number,
                "message": message,
                "from": "LMS"
            }
            
            response = requests.post(AT_SMS_URL, headers=headers, data=data)
            
            if response.status_code == 201:
                logger.info(f"SMS sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"Failed to send SMS: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False
    
    def _get_ai_summary(self, resource: Dict) -> str:
        """Get AI summary of resource (placeholder implementation)"""
        try:
            # This would typically call an AI service
            # For now, return a mock summary
            mock_summary = f"This {resource['subject']} resource for {resource['grade']} students covers fundamental concepts and provides practical examples. It's designed to help students understand core principles and apply them in real-world scenarios."
            
            # In production, you would call an AI service like:
            # response = requests.post(AI_SERVICE_URL, 
            #     headers={"Authorization": f"Bearer {AI_API_KEY}"},
            #     json={
            #         "model": "gpt-3.5-turbo",
            #         "messages": [{"role": "user", "content": f"Summarize this educational resource: {resource['title']} - {resource['description']}"}]
            #     }
            # )
            
            return mock_summary[:200] + "..." if len(mock_summary) > 200 else mock_summary
            
        except Exception as e:
            logger.error(f"Error getting AI summary: {e}")
            return "Unable to generate summary at this time."

# Initialize USSD service
ussd_service = USSDService()

# FastAPI app for USSD endpoint
app = FastAPI(title="LMS USSD Service", version="1.0.0")

@app.post("/ussd")
async def handle_ussd(request: USSDRequest):
    """
    Handle Africa's Talking USSD callbacks
    
    Expected request format:
    {
        "sessionId": "string",
        "serviceCode": "string", 
        "phoneNumber": "string",
        "text": "string"
    }
    """
    try:
        logger.info(f"USSD request received: {request.dict()}")
        
        # Process USSD request
        response_text = ussd_service.process_ussd_request(request)
        
        # Store phone number in session for SMS functionality
        session_id = request.sessionId
        if session_id in ussd_sessions:
            ussd_sessions[session_id]["phone_number"] = request.phoneNumber
        
        # Return response in Africa's Talking format
        response = USSDResponse(
            sessionId=request.sessionId,
            serviceCode=request.serviceCode,
            phoneNumber=request.phoneNumber,
            text=response_text
        )
        
        logger.info(f"USSD response: {response.dict()}")
        return response
        
    except Exception as e:
        logger.error(f"Error handling USSD request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "LMS USSD Handler"}

@app.get("/sessions")
async def get_sessions():
    """Get current USSD sessions (for debugging)"""
    return {"sessions": ussd_sessions, "count": len(ussd_sessions)}

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific USSD session"""
    if session_id in ussd_sessions:
        del ussd_sessions[session_id]
        return {"message": f"Session {session_id} cleared"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


