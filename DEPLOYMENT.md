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

### Step 2: Deploy on Render

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Click "New +" → "Blueprint"**
3. **Connect your GitHub repository**
4. **Render will automatically detect the `render.yaml` file**
5. **Set Environment Variables:**
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
6. **Click "Apply"**

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

## Next Steps After Deployment

1. **Set up custom domain** (optional)
2. **Configure SSL certificates** (automatic on Render)
3. **Set up monitoring** and alerts
4. **Configure backups** for your database
5. **Set up CI/CD** for automatic deployments
