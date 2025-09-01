import requests
import os
import logging
from typing import Dict, List, Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class AITranslator:
    def __init__(self):
        self.api_key = os.getenv('HUGGINGFACE_API_KEY')
        self.base_url = "https://api-inference.huggingface.co/models"
        
        # Pre-trained translation models for different language pairs
        self.translation_models = {
            "en-sw": "Helsinki-NLP/opus-mt-en-sw",  # English to Swahili
            "sw-en": "Helsinki-NLP/opus-mt-sw-en",  # Swahili to English
            "en-fr": "Helsinki-NLP/opus-mt-en-fr",  # English to French
            "fr-en": "Helsinki-NLP/opus-mt-fr-en",  # French to English
            "en-ar": "Helsinki-NLP/opus-mt-en-ar",  # English to Arabic
            "ar-en": "Helsinki-NLP/opus-mt-ar-en",  # Arabic to English
            "en-zh": "Helsinki-NLP/opus-mt-en-zh",  # English to Chinese
            "zh-en": "Helsinki-NLP/opus-mt-zh-en",  # Chinese to English
        }
    
    async def translate_text(self, text: str, target_language: str, source_language: str = "en") -> Dict:
        """
        Translate text using Hugging Face models
        
        Args:
            text: Text to translate
            target_language: Target language code (e.g., 'sw', 'fr', 'ar')
            source_language: Source language code (default: 'en')
        
        Returns:
            Dict containing translated text and metadata
        """
        if not self.api_key:
            raise HTTPException(status_code=500, detail="Hugging Face API key not configured")
        
        # Determine model to use
        model_key = f"{source_language}-{target_language}"
        if model_key not in self.translation_models:
            raise HTTPException(status_code=400, detail=f"Translation from {source_language} to {target_language} not supported")
        
        model_name = self.translation_models[model_key]
        
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            payload = {"inputs": text}
            
            response = requests.post(
                f"{self.base_url}/{model_name}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                translated_text = result[0].get('translation_text', text)
                
                return {
                    "original_text": text,
                    "translated_text": translated_text,
                    "source_language": source_language,
                    "target_language": target_language,
                    "model_used": model_name,
                    "confidence": 0.95  # Mock confidence score
                }
            else:
                logger.error(f"Translation API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Translation service temporarily unavailable")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Translation request failed: {e}")
            raise HTTPException(status_code=500, detail="Translation service request failed")
        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise HTTPException(status_code=500, detail="Translation failed")
    
    async def translate_resource(self, resource_id: int, target_language: str, 
                               source_language: str = "en") -> Dict:
        """
        Translate an entire educational resource
        
        Args:
            resource_id: ID of the resource to translate
            target_language: Target language code
            source_language: Source language code
        
        Returns:
            Dict containing translation details
        """
        # This would typically fetch the resource from database
        # For now, we'll return a mock response
        return {
            "resource_id": resource_id,
            "translation_status": "completed",
            "target_language": target_language,
            "translated_content": f"Translated content for resource {resource_id}",
            "audio_url": None,  # Could be generated using text-to-speech
            "summary": f"Summary of translated resource {resource_id}"
        }
    
    async def get_supported_languages(self) -> List[Dict]:
        """Get list of supported languages for translation"""
        return [
            {"code": "sw", "name": "Swahili", "native_name": "Kiswahili"},
            {"code": "fr", "name": "French", "native_name": "Français"},
            {"code": "ar", "name": "Arabic", "native_name": "العربية"},
            {"code": "zh", "name": "Chinese", "native_name": "中文"},
            {"code": "es", "name": "Spanish", "native_name": "Español"},
            {"code": "pt", "name": "Portuguese", "native_name": "Português"},
            {"code": "de", "name": "German", "native_name": "Deutsch"},
            {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
        ]
    
    async def generate_summary(self, text: str, language: str = "en") -> str:
        """
        Generate a summary of the translated text
        This could use a different Hugging Face model for summarization
        """
        try:
            # For now, return a simple summary
            words = text.split()
            if len(words) > 50:
                return " ".join(words[:50]) + "..."
            return text
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return text[:100] + "..." if len(text) > 100 else text

# Global instance
ai_translator = AITranslator()
