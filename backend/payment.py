import requests
import os
import uuid
from typing import Dict, Optional, List
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SubscriptionPlan:
    def __init__(self, name: str, price: float, upload_limit: int, features: List[str]):
        self.name = name
        self.price = price
        self.upload_limit = upload_limit
        self.features = features

class PaymentProcessor:
    def __init__(self, provider: str = "flutterwave"):
        self.provider = provider
        self.config = self._load_config()
        
        # Define subscription plans
        self.subscription_plans = {
            "free": SubscriptionPlan("Free", 0.0, 3, ["Basic access", "3 uploads/month"]),
            "basic": SubscriptionPlan("Basic", 5.0, 15, ["15 uploads/month", "AI translation", "Priority support"]),
            "premium": SubscriptionPlan("Premium", 15.0, 50, ["50 uploads/month", "AI translation", "Audio generation", "Priority support", "Analytics"]),
            "enterprise": SubscriptionPlan("Enterprise", 50.0, 200, ["200 uploads/month", "All features", "Custom integrations", "Dedicated support"])
        }
    
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
    
    def get_subscription_plans(self) -> Dict:
        """Get available subscription plans"""
        return {name: {
            "name": plan.name,
            "price": plan.price,
            "upload_limit": plan.upload_limit,
            "features": plan.features
        } for name, plan in self.subscription_plans.items()}
    
    def get_plan_by_name(self, plan_name: str) -> Optional[SubscriptionPlan]:
        """Get a specific subscription plan"""
        return self.subscription_plans.get(plan_name)
    
    async def initiate_subscription_payment(self, plan_name: str, user_email: str, 
                                         user_id: int, phone: Optional[str] = None) -> Dict:
        """Initiate payment for a subscription plan"""
        plan = self.get_plan_by_name(plan_name)
        if not plan:
            raise ValueError(f"Invalid plan: {plan_name}")
        
        # Create subscription metadata
        metadata = {
            "plan_name": plan_name,
            "user_id": user_id,
            "upload_limit": plan.upload_limit,
            "subscription_type": "monthly"
        }
        
        return await self.initiate_payment(
            amount=plan.price,
            email=user_email,
            phone=phone,
            currency="KES",
            metadata=metadata
        )
    
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
            'customizations': {'title': 'TransLearn LMS', 'description': 'Educational Resources Payment'},
            'meta': metadata or {}
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            data = response.json()
            return {
                'payment_url': data['data']['link'],
                'transaction_id': tx_ref,
                'status': 'pending',
                'amount': amount,
                'plan_details': metadata
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
            'callback_url': f"{os.getenv('BASE_URL')}/payment/verify",
            'metadata': metadata or {}
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            data = response.json()
            return {
                'payment_url': data['data']['authorization_url'],
                'transaction_id': payload['reference'],
                'status': 'pending',
                'amount': amount,
                'plan_details': metadata
            }
        except Exception as e:
            logger.error(f"Paystack error: {e}")
            raise
    
    async def verify_payment(self, transaction_id: str) -> Dict:
        """Verify payment status"""
        if self.provider == "flutterwave":
            return await self._verify_flutterwave(transaction_id)
        elif self.provider == "paystack":
            return await self._verify_paystack(transaction_id)
        else:
            # Mock verification for testing
            return {'status': 'success', 'amount': 100.0, 'currency': 'KES'}
    
    async def _verify_flutterwave(self, transaction_id: str) -> Dict:
        url = f"{self.config['base_url']}/transactions/{transaction_id}/verify"
        headers = {'Authorization': f'Bearer {self.config["secret_key"]}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            data = response.json()
            
            if data['status'] == 'success':
                return {
                    'status': 'success',
                    'amount': float(data['data']['amount']),
                    'currency': data['data']['currency'],
                    'transaction_id': transaction_id,
                    'metadata': data['data'].get('meta', {})
                }
            else:
                return {'status': 'failed', 'message': 'Payment verification failed'}
                
        except Exception as e:
            logger.error(f"Flutterwave verification error: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def _verify_paystack(self, transaction_id: str) -> Dict:
        url = f"{self.config['base_url']}/transaction/verify/{transaction_id}"
        headers = {'Authorization': f'Bearer {self.config["secret_key"]}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            data = response.json()
            
            if data['status']:
                return {
                    'status': 'success',
                    'amount': float(data['data']['amount']) / 100,  # Convert from kobo
                    'currency': data['data']['currency'],
                    'transaction_id': transaction_id,
                    'metadata': data['data'].get('metadata', {})
                }
            else:
                return {'status': 'failed', 'message': 'Payment verification failed'}
                
        except Exception as e:
            logger.error(f"Paystack verification error: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def check_upload_limit(self, user_subscription: str, current_uploads: int) -> Dict:
        """Check if user can upload more resources"""
        plan = self.get_plan_by_name(user_subscription)
        if not plan:
            return {"can_upload": False, "message": "Invalid subscription plan"}
        
        remaining_uploads = plan.upload_limit - current_uploads
        
        if remaining_uploads > 0:
            return {
                "can_upload": True,
                "remaining_uploads": remaining_uploads,
                "total_limit": plan.upload_limit
            }
        else:
            return {
                "can_upload": False,
                "message": f"You've reached your upload limit of {plan.upload_limit}. Upgrade your plan for more uploads.",
                "upgrade_required": True,
                "current_plan": user_subscription
            }

# Global instance
payment_processor = PaymentProcessor()