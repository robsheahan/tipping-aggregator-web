# 🚀 Push to GitHub → Import to Vercel

## Easiest Path: 3 Steps, 5 Minutes

### Step 1: Create GitHub Repository (1 minute)

1. Go to: https://github.com/new
2. Fill in:
   - **Repository name**: `tipping-aggregator`
   - **Description**: Serverless sports odds aggregator
   - **Visibility**: Public or Private (your choice)
   - **DON'T** check any initialization options
3. Click "Create repository"
4. Copy the URL (like `https://github.com/yourusername/tipping-aggregator.git`)

### Step 2: Push Code to GitHub (1 minute)

**Option A: Use the automated script**
```bash
./PUSH_TO_GITHUB.sh
```

**Option B: Manual commands**
```bash
# Add your GitHub repo URL
git remote add origin https://github.com/YOUR_USERNAME/tipping-aggregator.git

# Push to GitHub
git push -u origin main
```

### Step 3: Import to Vercel (3 minutes)

1. **Go to**: https://vercel.com/new
2. **Click**: "Import Git Repository"
3. **Select**: Your GitHub repository (tipping-aggregator)
4. **Configure Project**:
   - **Root Directory**: `web` ← IMPORTANT!
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. **Add Environment Variable**:
   - Click "Environment Variables"
   - **Name**: `THEODDSAPI_KEY`
   - **Value**: [your key from https://the-odds-api.com/]
   - Click "Add"
6. **Click**: "Deploy"
7. **Wait** 2-3 minutes
8. **Get your URL!** 🎉

---

## Your Live URL

After deployment, you'll get a URL like:
```
https://tipping-aggregator-abc123.vercel.app
```

Or with custom domain:
```
https://odds.yourdomain.com
```

---

## Detailed Guide

### Prerequisites

- [x] Git repository initialized (already done ✅)
- [x] Code committed (already done ✅)
- [ ] GitHub account (create at github.com)
- [ ] TheOddsAPI key (get at the-odds-api.com)
- [ ] Vercel account (create at vercel.com)

### Authentication

You'll need to authenticate with GitHub when pushing:

**Option 1: GitHub CLI (recommended)**
```bash
# Install GitHub CLI
# macOS: brew install gh
# Windows: winget install GitHub.cli
# Linux: see https://cli.github.com/

# Login
gh auth login

# Push
git push -u origin main
```

**Option 2: Personal Access Token**
```bash
# Generate token at: https://github.com/settings/tokens
# Select scopes: repo (full control)

# Use token as password when prompted
git push -u origin main
# Username: your_username
# Password: ghp_your_personal_access_token
```

**Option 3: SSH Keys**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: https://github.com/settings/keys

# Change remote to SSH
git remote set-url origin git@github.com:USERNAME/tipping-aggregator.git

# Push
git push -u origin main
```

---

## Vercel Import Settings

When importing to Vercel, ensure these settings:

### Build & Development Settings
```
Root Directory: web
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

### Environment Variables
```
THEODDSAPI_KEY = your_api_key_here
```

**Important**: The API key is only needed in Vercel environment variables. It's not in your code, so it stays secure.

---

## What Gets Deployed

Only the `web/` directory is deployed:
```
web/
├── src/
│   ├── app/
│   │   ├── api/              # Serverless functions
│   │   ├── page.tsx          # Homepage
│   │   └── matches/[id]/     # Match detail page
│   ├── lib/
│   │   ├── odds/             # Odds aggregation library
│   │   ├── api.ts
│   │   └── types.ts
│   └── components/
├── package.json
├── vercel.json               # Deployment config
└── .env.local.example        # Template (not deployed)
```

Files NOT deployed (automatically ignored):
- `.env.local` (stays local)
- `node_modules/` (rebuilt on Vercel)
- `.next/` (rebuilt on Vercel)
- Python backend (we removed it)

---

## Verify Deployment

After deployment completes, test your live site:

### 1. Check Homepage
```
https://your-app.vercel.app
```
- Should show EPL/AFL/NRL tabs
- Should load without errors

### 2. Test API Endpoints
```bash
# Test leagues
curl https://your-app.vercel.app/api/leagues | jq

# Test matches
curl "https://your-app.vercel.app/api/matches?league=EPL" | jq
```

### 3. Test Match Details
- Click any match card
- Should show bookmaker odds breakdown
- Verify multiple bookmakers listed

### 4. Check Mobile
- Open DevTools (F12)
- Toggle device toolbar
- Test on different screen sizes

---

## Troubleshooting

### Problem: Can't push to GitHub

**Authentication failed**
```bash
# Use GitHub CLI
gh auth login

# Or generate personal access token
# https://github.com/settings/tokens
```

**Repository doesn't exist**
```bash
# Create it first at https://github.com/new
# Then add remote
git remote add origin https://github.com/USERNAME/tipping-aggregator.git
```

### Problem: Vercel build fails

**"Cannot find module '@/lib/odds/types'"**
- Check Root Directory is set to `web`
- Rebuild: Deployments → click ⋮ → Redeploy

**"THEODDSAPI_KEY is not set"**
- Go to Settings → Environment Variables
- Add `THEODDSAPI_KEY` with your key
- Redeploy

### Problem: Odds not loading

**Check API key**
1. Vercel dashboard → Settings → Environment Variables
2. Verify `THEODDSAPI_KEY` is set
3. Check key is valid at https://the-odds-api.com/account

**Check API usage**
- Free tier: 500 requests/month
- Caching reduces usage significantly
- Monitor at https://the-odds-api.com/account

### Problem: 404 errors on routes

**Root directory not set**
- Go to Settings → General
- Set Root Directory to `web`
- Redeploy

---

## Continuous Deployment

After initial setup, updates are automatic:

```bash
# Make changes locally
nano web/src/app/page.tsx

# Commit
git add .
git commit -m "Update homepage"

# Push to GitHub
git push

# Vercel automatically deploys! (1-2 min)
```

---

## Custom Domain

To use your own domain:

1. **In Vercel**: Settings → Domains
2. **Add**: `odds.yourdomain.com`
3. **Update DNS** at your domain provider:
   ```
   Type: CNAME
   Name: odds
   Value: cname.vercel-dns.com
   ```
4. **Wait**: DNS propagation (up to 24 hours)
5. **Done**: HTTPS automatically provisioned

---

## Cost

Both GitHub and Vercel are free for this project:

**GitHub Free**:
- Unlimited public/private repos
- Unlimited commits
- 2,000 Actions minutes/month

**Vercel Free**:
- 100GB bandwidth/month
- Unlimited API requests
- Automatic HTTPS
- Global CDN
- 100 deployments/day

**TheOddsAPI Free**:
- 500 requests/month
- Sufficient with caching

---

## Summary

```bash
# 1. Create GitHub repo
https://github.com/new

# 2. Push code
./PUSH_TO_GITHUB.sh
# OR
git remote add origin https://github.com/USERNAME/tipping-aggregator.git
git push -u origin main

# 3. Import to Vercel
https://vercel.com/new
- Select repo
- Root Directory: web
- Add env: THEODDSAPI_KEY
- Deploy!

# 4. Get URL
https://your-app.vercel.app
```

**Total time**: 5 minutes

**Your live website**: Production-ready sports odds aggregator! 🎉

---

## Next Steps

After deployment:
1. Test all features
2. Share your URL
3. Monitor API usage
4. Consider custom domain
5. Add to portfolio

Need help? Check the deployment logs in Vercel dashboard.
