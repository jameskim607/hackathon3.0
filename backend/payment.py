import requests
import os
import uuid
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class PaymentProcessor:
    def __init__(self, provider: str = "flutterwave"):
        self.provider = provider
        self.config = self._load_config()
    
    def _load_config(self) -> Dict:
        return {
            "flutterwave": {
                'public_key': os.getenv('FLW_PUBLIC_KEY'),
                'secret_key': os.getenv('FLW_SECRET_KEY'),
                'base_url': 'https://api.flutterwave.com/v3'
            },
            "paystack": {
                'public_key': os.getenv('PAYSTACK_PUBLIC_KEY'),
                'secret_key': os.getenv('PAYSTACK_SECRET_KEY'),
                'base_url': 'https://api.paystack.co'
            }
        }.get(self.provider, {})
    
    async def initiate_payment(self, amount: float, email: str, phone: Optional[str] = None, 
                             currency: str = "KES", metadata: Optional[Dict] = None) -> Dict:
        if self.provider == "flutterwave":
            return await self._initiate_flutterwave(amount, email, phone, currency, metadata)
        elif self.provider == "paystack":
            return await self._initiate_paystack(amount, email, phone, currency, metadata)
        else:
            raise ValueError("Unsupported payment provider")
    
    async def _initiate_flutterwave(self, amount: float, email: str, phone: Optional[str], 
                                  currency: str, metadata: Optional[Dict]) -> Dict:
        url = f"{self.config['base_url']}/payments"
        headers = {'Authorization': f'Bearer {self.config["secret_key"]}', 'Content-Type': 'application/json'}
        
        tx_ref = f"translearn_{uuid.uuid4().hex[:10]}"
        payload = {
            'tx_ref': tx_ref,
            'amount': str(amount),
            'currency': currency,
            'redirect_url': f"{os.getenv('BASE_URL')}/payment/verify",
            'customer': {'email': email, 'phonenumber': phone or "", 'name': 'TransLearn User'},
            'customizations': {'title': 'TransLearn LMS', 'description': 'Educational Resources Payment'}
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            data = response.json()
            return {
                'payment_url': data['data']['link'],
                'transaction_id': tx_ref,
                'status': 'pending'
            }
        except Exception as e:
            logger.error(f"Flutterwave error: {e}")
            raise
    
    async def _initiate_paystack(self, amount: float, email: str, phone: Optional[str],
                               currency: str, metadata: Optional[Dict]) -> Dict:
        url = f"{self.config['base_url']}/transaction/initialize"
        headers = {'Authorization': f'Bearer {self.config["secret_key"]}', 'Content-Type': 'application/json'}
        
        payload = {
            'email': email,
            'amount': int(amount * 100),
            'currency': currency,
            'reference': f"translearn_{uuid.uuid4().hex[:10]}",
            'callback_url': f"{os.getenv('BASE_URL')}/payment/verify"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            data = response.json()
            return {
                'payment_url': data['data']['authorization_url'],
                'transaction_id': payload['reference'],
                'status': 'pending'
            }
        except Exception as e:
            logger.error(f"Paystack error: {e}")
            raise
    
    async def verify_payment(self, transaction_id: str) -> Dict:
        # Mock verification - implement actual API call
        return {'status': 'success', 'amount': 100.0, 'currency': 'KES'}

payment_processor = PaymentProcessor()