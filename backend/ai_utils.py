"""
AI Utilities for LMS
Provides translation, summarization, and text-to-speech capabilities
"""

import os
import logging
from typing import Optional, Dict, Any
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration for external AI services
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "your_huggingface_api_key")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your_openai_api_key")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "your_elevenlabs_api_key")

# API endpoints
HUGGINGFACE_TRANSLATION_URL = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-{}"
HUGGINGFACE_SUMMARIZATION_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"

def translate_text(text: str, target_language: str) -> Dict[str, Any]:
    """
    Translate text to target language using Hugging Face or external API
    
    Args:
        text (str): Text to translate
        target_language (str): Target language code (e.g., 'es', 'fr', 'de')
    
    Returns:
        Dict containing translation result and metadata
    """
    try:
        # Placeholder implementation - replace with actual API calls
        logger.info(f"Translating text to {target_language}")
        
        # For now, return a mock translation
        # In production, implement actual translation logic:
        
        # Option 1: Hugging Face Translation
        # if HUGGINGFACE_API_KEY != "your_huggingface_api_key":
        #     headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
        #     response = requests.post(
        #         HUGGINGFACE_TRANSLATION_URL.format(target_language),
        #         headers=headers,
        #         json={"inputs": text}
        #     )
        #     if response.status_code == 200:
        #         result = response.json()
        #         return {
        #             "translated_text": result[0]["translation_text"],
        #             "source_language": "en",
        #             "target_language": target_language,
        #             "confidence": 0.95,
        #             "provider": "huggingface"
        #         }
        
        # Option 2: OpenAI Translation
        # if OPENAI_API_KEY != "your_openai_api_key":
        #     headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        #     response = requests.post(
        #         "https://api.openai.com/v1/chat/completions",
        #         headers=headers,
        #         json={
        #             "model": "gpt-3.5-turbo",
        #             "messages": [{
        #                 "role": "user",
        #                 "content": f"Translate the following text to {target_language}: {text}"
        #             }]
        #         }
        #     )
        #     if response.status_code == 200:
        #         result = response.json()
        #         return {
        #             "translated_text": result["choices"][0]["message"]["content"],
        #             "source_language": "en",
        #             "target_language": target_language,
        #             "confidence": 0.90,
        #             "provider": "openai"
        #         }
        
        # Mock response for development
        mock_translations = {
            'es': f"[ES] {text}",
            'fr': f"[FR] {text}",
            'de': f"[DE] {text}",
            'ar': f"[AR] {text}",
            'zh': f"[ZH] {text}",
            'ja': f"[JA] {text}",
            'ko': f"[KO] {text}",
            'hi': f"[HI] {text}",
            'pt': f"[PT] {text}",
            'ru': f"[RU] {text}"
        }
        
        translated_text = mock_translations.get(target_language, f"[{target_language.upper()}] {text}")
        
        return {
            "translated_text": translated_text,
            "source_language": "en",
            "target_language": target_language,
            "confidence": 0.85,
            "provider": "mock",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return {
            "translated_text": text,  # Return original text on error
            "source_language": "en",
            "target_language": target_language,
            "confidence": 0.0,
            "provider": "error",
            "status": "error",
            "error": str(e)
        }

def summarize_text(text: str, max_length: int = 150) -> Dict[str, Any]:
    """
    Generate a short summary of the input text
    
    Args:
        text (str): Text to summarize
        max_length (int): Maximum length of summary
    
    Returns:
        Dict containing summary and metadata
    """
    try:
        logger.info(f"Summarizing text (max length: {max_length})")
        
        # Placeholder implementation - replace with actual API calls
        # In production, implement actual summarization logic:
        
        # Option 1: Hugging Face Summarization
        # if HUGGINGFACE_API_KEY != "your_huggingface_api_key":
        #     headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
        #     response = requests.post(
        #         HUGGINGFACE_SUMMARIZATION_URL,
        #         headers=headers,
        #         json={
        #             "inputs": text,
        #             "parameters": {
        #                 "max_length": max_length,
        #                 "min_length": 30,
        #                 "do_sample": False
        #             }
        #         }
        #     )
        #     if response.status_code == 200:
        #         result = response.json()
        #         return {
        #             "summary": result[0]["summary_text"],
        #             "original_length": len(text),
        #             "summary_length": len(result[0]["summary_text"]),
        #             "compression_ratio": len(result[0]["summary_text"]) / len(text),
        #             "provider": "huggingface",
        #             "status": "success"
        #         }
        
        # Option 2: OpenAI Summarization
        # if OPENAI_API_KEY != "your_openai_api_key":
        #     headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        #     response = requests.post(
        #         "https://api.openai.com/v1/chat/completions",
        #         headers=headers,
        #         json={
        #             "model": "gpt-3.5-turbo",
        #             "messages": [{
        #                 "role": "user",
        #                 "content": f"Summarize the following text in {max_length} characters or less: {text}"
        #             }]
        #         }
        #     )
        #     if response.status_code == 200:
        #         result = response.json()
        #         summary = result["choices"][0]["message"]["content"]
        #         return {
        #             "summary": summary,
        #             "original_length": len(text),
        #             "summary_length": len(summary),
        #             "compression_ratio": len(summary) / len(text),
        #             "provider": "openai",
        #             "status": "success"
        #         }
        
        # Mock summarization for development
        if len(text) <= max_length:
            summary = text
        else:
            # Simple truncation with ellipsis
            summary = text[:max_length-3] + "..."
        
        return {
            "summary": summary,
            "original_length": len(text),
            "summary_length": len(summary),
            "compression_ratio": len(summary) / len(text),
            "provider": "mock",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return {
            "summary": text[:max_length] + "..." if len(text) > max_length else text,
            "original_length": len(text),
            "summary_length": min(len(text), max_length),
            "compression_ratio": 1.0,
            "provider": "error",
            "status": "error",
            "error": str(e)
        }

def text_to_speech(text: str, language: str = "en") -> Dict[str, Any]:
    """
    Convert text to speech and return MP3 URL
    
    Args:
        text (str): Text to convert to speech
        language (str): Language code for TTS
    
    Returns:
        Dict containing TTS result and audio URL
    """
    try:
        logger.info(f"Converting text to speech in {language}")
        
        # Placeholder implementation - replace with actual API calls
        # In production, implement actual TTS logic:
        
        # Option 1: ElevenLabs TTS
        # if ELEVENLABS_API_KEY != "your_elevenlabs_api_key":
        #     headers = {"xi-api-key": ELEVENLABS_API_KEY}
        #     
        #     # Get available voices
        #     voices_response = requests.get(
        #         "https://api.elevenlabs.io/v1/voices",
        #         headers=headers
        #     )
        #     
        #     if voices_response.status_code == 200:
        #         voices = voices_response.json()["voices"]
        #         # Select appropriate voice for language
        #         voice_id = next((v["voice_id"] for v in voices if language in v.get("labels", {})), voices[0]["voice_id"])
        #         
        #         # Generate speech
        #         tts_response = requests.post(
        #             f"{ELEVENLABS_TTS_URL}/{voice_id}",
        #             headers=headers,
        #             json={
        #                 "text": text,
        #                 "model_id": "eleven_monolingual_v1",
        #                 "voice_settings": {
        #                     "stability": 0.5,
        #                     "similarity_boost": 0.5
        #                 }
        #             }
        #         )
        #         
        #         if tts_response.status_code == 200:
        #             # Save audio file and return URL
        #             # This would typically save to your storage service
        #             audio_url = f"https://your-storage.com/audio/{voice_id}_{hash(text)}.mp3"
        #             return {
        #                 "audio_url": audio_url,
        #                 "text_length": len(text),
        #                 "language": language,
        #                 "provider": "elevenlabs",
        #                 "status": "success"
        #             }
        
        # Option 2: OpenAI TTS
        # if OPENAI_API_KEY != "your_openai_api_key":
        #     headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        #     response = requests.post(
        #         "https://api.openai.com/v1/audio/speech",
        #         headers=headers,
        #         json={
        #             "model": "tts-1",
        #             "input": text,
        #             "voice": "alloy"  # or "echo", "fable", "onyx", "nova", "shimmer"
        #         }
        #     )
        #     
        #     if response.status_code == 200:
        #         # Save audio file and return URL
        #         audio_url = f"https://your-storage.com/audio/openai_{hash(text)}.mp3"
        #         return {
        #             "audio_url": audio_url,
        #             "text_length": len(text),
        #             "language": language,
        #             "provider": "openai",
        #             "status": "success"
        #         }
        
        # Mock TTS response for development
        # In a real implementation, you would:
        # 1. Call the TTS API
        # 2. Save the audio file to your storage (Supabase, S3, etc.)
        # 3. Return the public URL
        
        mock_audio_url = f"https://your-storage.com/audio/mock_{language}_{hash(text) % 1000}.mp3"
        
        return {
            "audio_url": mock_audio_url,
            "text_length": len(text),
            "language": language,
            "provider": "mock",
            "status": "success",
            "note": "This is a mock URL. Implement actual TTS service integration."
        }
        
    except Exception as e:
        logger.error(f"Text-to-speech error: {e}")
        return {
            "audio_url": None,
            "text_length": len(text),
            "language": language,
            "provider": "error",
            "status": "error",
            "error": str(e)
        }

def get_supported_languages() -> Dict[str, Dict[str, str]]:
    """
    Get list of supported languages for translation and TTS
    
    Returns:
        Dict mapping language codes to language names and features
    """
    return {
        "en": {"name": "English", "translation": True, "tts": True},
        "es": {"name": "Spanish", "translation": True, "tts": True},
        "fr": {"name": "French", "translation": True, "tts": True},
        "de": {"name": "German", "translation": True, "tts": True},
        "it": {"name": "Italian", "translation": True, "tts": True},
        "pt": {"name": "Portuguese", "translation": True, "tts": True},
        "ru": {"name": "Russian", "translation": True, "tts": True},
        "zh": {"name": "Chinese", "translation": True, "tts": True},
        "ja": {"name": "Japanese", "translation": True, "tts": True},
        "ko": {"name": "Korean", "translation": True, "tts": True},
        "ar": {"name": "Arabic", "translation": True, "tts": False},
        "hi": {"name": "Hindi", "translation": True, "tts": True},
        "sw": {"name": "Swahili", "translation": True, "tts": False},
        "yo": {"name": "Yoruba", "translation": True, "tts": False},
        "zu": {"name": "Zulu", "translation": True, "tts": False}
    }

def validate_language_support(language: str, feature: str = "translation") -> bool:
    """
    Check if a language supports a specific feature
    
    Args:
        language (str): Language code to check
        feature (str): Feature to check ('translation' or 'tts')
    
    Returns:
        bool: True if language supports the feature
    """
    supported_languages = get_supported_languages()
    if language not in supported_languages:
        return False
    
    return supported_languages[language].get(feature, False)

# Example usage and testing
if __name__ == "__main__":
    # Test the functions
    test_text = "This is a sample text for testing the AI utilities functions."
    
    print("=== AI Utilities Test ===")
    
    # Test translation
    translation = translate_text(test_text, "es")
    print(f"Translation: {translation}")
    
    # Test summarization
    summary = summarize_text(test_text, 50)
    print(f"Summary: {summary}")
    
    # Test TTS
    tts = text_to_speech(test_text, "en")
    print(f"TTS: {tts}")
    
    # Test language support
    print(f"Spanish TTS support: {validate_language_support('es', 'tts')}")
    print(f"Arabic TTS support: {validate_language_support('ar', 'tts')}")


