# 🚀 LMS Deployment Guide

## Deploy to Render (Recommended)

### Prerequisites
- GitHub account
- Render account (free tier available)
- Your Supabase credentials

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Deploy on Render (Web Service - FREE)

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Click "New +" → "Web Service"** (NOT Blueprint - that's paid)
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `lms-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install fastapi uvicorn pydantic python-multipart python-dotenv supabase python-dotenv`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Set Environment Variables:**
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
6. **Click "Create Web Service"**

### Step 3: Update Frontend API URL

After deployment, update your frontend files to use the new backend URL:

**Option A: Manual Update**
In `frontend/script.js`, change:
```javascript
const API_BASE_URL = 'https://YOUR_BACKEND_NAME.onrender.com';
```

**Option B: Environment Variable (Recommended)**
Render will automatically set `window.API_BASE_URL` for you.

### Step 4: Test Your Deployment

- **Backend API**: `https://YOUR_BACKEND_NAME.onrender.com`
- **Frontend**: `https://YOUR_FRONTEND_NAME.onrender.com`

## Alternative Platforms

### Railway
- Similar to Render
- Good for Python apps
- Automatic deployments

### Heroku
- More established platform
- Free tier discontinued
- Good for production apps

### Vercel
- Great for frontend
- Good for full-stack apps
- Easy deployment

## Environment Variables

Make sure these are set in your deployment platform:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PORT=8000
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Check requirements.txt and Python version
2. **Environment variables**: Ensure all required vars are set
3. **CORS errors**: Backend is configured to allow all origins
4. **Database connection**: Verify Supabase credentials

### Debug Commands:
```bash
# Check logs
render logs

# Restart service
render restart
```

## Cost Estimation

- **Render Free Tier**: $0/month (limited usage)
- **Render Paid**: $7/month per service
- **Supabase**: Free tier available

## How File Uploads & Viewing Work

### **Complete File Flow:**

1. **Teacher Uploads File:**
   - Goes to `upload.html` page
   - Selects file and fills form
   - File uploaded to Supabase Storage
   - File URL stored in database

2. **Students View Files:**
   - Go to `index.html` (student portal)
   - Browse resources by subject/grade
   - Click on resource to see details
   - Download/view files directly from Supabase

3. **File Storage:**
   - Files stored in Supabase Storage (cloud)
   - File URLs are public and accessible
   - No local file storage needed

### **What Students See:**
- Resource list with titles, descriptions, subjects
- Click resource → Opens modal with file download link
- Direct access to PDFs, documents, videos, etc.

## Next Steps After Deployment

1. **Test file upload** from teacher dashboard
2. **Test file viewing** from student portal
3. **Set up custom domain** (optional)
4. **Configure SSL certificates** (automatic on Render)
5. **Set up monitoring** and alerts
