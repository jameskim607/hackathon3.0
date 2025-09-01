#!/bin/bash

# ========================================
# TransLearn LMS Deployment Script
# ========================================
# This script helps you deploy your updated backend
# ========================================

echo "🚀 TransLearn LMS Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "backend/main.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: .env file not found in backend directory"
    echo "   Please create backend/.env with your environment variables"
    echo "   Use backend/env_template.txt as a reference"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
else
    echo "✅ Environment file found"
fi

# Check if database update script exists
if [ -f "database/update_schema.sql" ]; then
    echo "✅ Database update script found"
    echo ""
    echo "📋 Next steps for database update:"
    echo "   1. Connect to your Railway PostgreSQL database"
    echo "   2. Run: psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f database/update_schema.sql"
    echo "   3. Or copy the SQL content and run it in your database tool"
    echo ""
else
    echo "❌ Database update script not found"
    exit 1
fi

# Check Railway CLI
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    
    echo ""
    echo "🚀 Deploying to Railway..."
    echo ""
    
    # Change to backend directory
    cd backend
    
    # Deploy to Railway
    echo "Running: railway up"
    railway up
    
    echo ""
    echo "✅ Deployment completed!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check Railway dashboard for deployment status"
    echo "   2. Verify environment variables are set"
    echo "   3. Test your endpoints"
    echo "   4. Update database schema"
    
else
    echo "⚠️  Railway CLI not found"
    echo ""
    echo "📋 Manual deployment steps:"
    echo "   1. Install Railway CLI: npm install -g @railway/cli"
    echo "   2. Login: railway login"
    echo "   3. Link project: railway link"
    echo "   4. Deploy: railway up"
    echo ""
    echo "   Or deploy via Railway dashboard:"
    echo "   1. Go to railway.app"
    echo "   2. Connect your GitHub repository"
    echo "   3. Set environment variables"
    echo "   4. Deploy"
fi

echo ""
echo "🎯 What's been implemented:"
echo "   ✅ Enhanced database schema with subscription tracking"
echo "   ✅ Upload limit enforcement with database functions"
echo "   ✅ Payment system integration points"
echo "   ✅ AI translation service structure"
echo "   ✅ Environment variables template"
echo "   ✅ Deployment automation script"
echo ""
echo "🔑 What you still need to do:"
echo "   1. Get API keys from payment gateways"
echo "   2. Get Hugging Face API key"
echo "   3. Update database schema"
echo "   4. Set environment variables in Railway"
echo "   5. Deploy and test"
echo ""
echo "📚 Documentation:"
echo "   - Database schema: database/update_schema.sql"
echo "   - Environment template: backend/env_template.txt"
echo "   - Backend code: backend/main.py"
echo ""

echo "🎉 Setup complete! Your TransLearn LMS is ready for the next phase."
