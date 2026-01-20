# 🚀 Deploy to Vercel - Step by Step Guide

## ✅ Changes Pushed to GitHub

Your code has been successfully pushed to:
**https://github.com/robsheahan/tipping-aggregator-web**

Commit: `ada247d` - "Add AI-powered racing tips analysis with Claude integration"

## 📦 What Was Deployed

### New Features:
- ✅ Claude Sonnet 4.5 AI integration
- ✅ Expert tip analysis with confidence scores
- ✅ Consensus score calculation
- ✅ AI verdict generation
- ✅ Updated database client
- ✅ Demo scripts and testing tools

## 🌐 Deploy to Vercel (2 Options)

### Option 1: Automatic Deploy (Recommended)

If your GitHub repo is already connected to Vercel:

1. **Vercel will auto-deploy** when you push to main
2. Check your Vercel dashboard: https://vercel.com/dashboard
3. Look for the deployment in progress
4. Click on your project to see deployment status

### Option 2: Manual Deploy via Vercel Dashboard

If not connected yet:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Git Repository**
   - Click "Import Git Repository"
   - Select: `robsheahan/tipping-aggregator-web`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js**
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables** (IMPORTANT!)
   Click "Environment Variables" and add these:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://kjueriejebawtccuqxid.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqdWVyaWVqZWJhd3RjY3VxeGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTg4OTYsImV4cCI6MjA4NDAzNDg5Nn0.Y13XLdtLw8iK859aglBBxhpXGj7tVA5cOyRh08EVzxo
   THEODDSAPI_KEY=60421efaf7fbecb5328fbd6d5abaa349
   RACINGAPI_USERNAME=CGOD0RK5J6r6ii7WuSHh0nCa
   RACINGAPI_PASSWORD=hCt3wDBkOGRcw3sSIQ6t7Ttm
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   NODE_ENV=production
   ```

   **Note:** Replace `your-vercel-app` with your actual Vercel domain after first deploy.

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your site will be live!

## 🔑 Environment Variables Explained

### Frontend (Required for Vercel):

| Variable | Purpose | Where to Find |
|----------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key | Supabase Dashboard → Settings → API |
| `THEODDSAPI_KEY` | Sports odds API key | TheOddsAPI dashboard |
| `RACINGAPI_USERNAME` | Racing API username | Racing API account |
| `RACINGAPI_PASSWORD` | Racing API password | Racing API account |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | Auto-set after first deploy |
| `NODE_ENV` | Environment | Set to `production` |

### Backend (Not needed for Vercel frontend):

These are only needed if you deploy the Python backend separately:
- `ANTHROPIC_API_KEY` - For Claude AI (backend only)
- `SUPABASE_SERVICE_KEY` - For backend database operations

## 📱 After Deployment

### 1. Check Your Live Site

Visit your Vercel URL (e.g., `https://tipping-aggregator-web.vercel.app`)

You should see:
- ✅ Homepage with sport cards
- ✅ Racing page at `/racing`
- ✅ Demo data from Cheltenham race

### 2. View Demo Data

The demo data we created should be visible:
- Navigate to: `https://your-app.vercel.app/racing`
- You'll see the Cheltenham Champion Hurdle
- With AI consensus scores and verdicts

### 3. Verify API Connection

Check browser console for any errors:
- Press F12 → Console tab
- Look for Supabase connection logs
- Should show "Connected to database"

## 🔧 Troubleshooting

### Build Fails?

**Error: "Module not found"**
- Solution: Check that `web/` directory has `package.json`
- Verify root directory is set to `web` in Vercel settings

**Error: "Environment variable not found"**
- Solution: Add all required env vars in Vercel dashboard
- Redeploy after adding variables

### Site Loads But No Data?

**Check Supabase Connection:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Redeploy if you just added them

**Check Browser Console:**
- Press F12 → Console tab
- Look for Supabase errors
- Check Network tab for failed API calls

### Racing Page Shows "No Races"?

**Expected!**
- The demo data exists in Supabase
- But the Racing API needs the Australian add-on to fetch live data
- The demo Cheltenham race should still display if Supabase is connected

## 🎯 What's Live on Vercel

### Pages Available:

1. **Homepage** (`/`)
   - Sport selection cards
   - Links to AFL, NRL, Racing, etc.

2. **Racing Page** (`/racing`)
   - Horse racing odds comparison
   - AI consensus scores
   - Expert tip analysis
   - Displays demo Cheltenham data

3. **API Routes** (`/api/*`)
   - `/api/racing` - Fetch racing data from Supabase
   - `/api/matches` - Fetch team sports matches
   - `/api/leagues` - Fetch league data

### What's NOT on Vercel:

❌ **Python Backend/Worker** - Needs separate hosting:
- The AI analysis worker (Python)
- Background jobs (Celery)
- Scheduled data fetching

To run the worker, you'll need:
- A separate server (AWS, Railway, Fly.io, etc.)
- Or run it locally with `./run_worker.sh`

## 🚀 Next Steps After Vercel Deploy

### 1. Update Domain (Optional)

In Vercel Dashboard:
- Go to Project Settings → Domains
- Add your custom domain
- Update `NEXT_PUBLIC_APP_URL` env var

### 2. Enable Continuous Deployment

Already enabled! Every push to `main` will auto-deploy.

### 3. Deploy Python Worker (Optional)

To run automatic AI analysis:

**Option A: Railway**
```bash
# Install Railway CLI
npm install -g railway

# Login and deploy
railway login
railway init
railway up
```

**Option B: Fly.io**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

**Option C: Run Locally**
```bash
./run_worker.sh
```

## 📊 Monitoring Your Deployment

### Vercel Dashboard:
- Real-time logs
- Build status
- Performance analytics
- Usage stats

### Supabase Dashboard:
- View database tables
- Check API logs
- Monitor queries

## 🎊 Success Checklist

- ✅ Code pushed to GitHub
- ⬜ Vercel project connected
- ⬜ Environment variables configured
- ⬜ Site deployed and live
- ⬜ Homepage loads correctly
- ⬜ Racing page displays demo data
- ⬜ Supabase connected (check console)

---

## 💡 Pro Tips

1. **Enable Vercel Analytics** (free tier available)
2. **Set up domain redirects** in Vercel settings
3. **Monitor Supabase usage** to stay within free tier
4. **Check Vercel logs** if something breaks

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Check deployment logs in Vercel Dashboard

---

**Ready to deploy? Follow Option 1 or Option 2 above!** 🚀
