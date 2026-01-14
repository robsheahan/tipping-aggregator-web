# 🚀 Deploy Sports Odds Aggregator to Vercel

Your serverless sports odds aggregation website is ready to deploy!

## ✅ What's Ready

- Serverless Next.js website
- Live odds aggregation from TheOddsAPI
- Three leagues: EPL, AFL, NRL
- Fully responsive design
- Edge-cached API routes (5min cache)
- Zero infrastructure costs

## 📋 Prerequisites

1. GitHub account (to push your code)
2. Vercel account (free at https://vercel.com)
3. TheOddsAPI key (free at https://the-odds-api.com/)

## 🎯 Deployment Steps

### Step 1: Get TheOddsAPI Key (2 minutes)

1. Visit https://the-odds-api.com/
2. Click "Get Started Free"
3. Sign up for free account
4. Copy your API key (you'll need it for Step 3)

### Step 2: Push to GitHub (1 minute)

```bash
# Add GitHub remote (if you haven't already)
git remote add origin https://github.com/YOUR_USERNAME/tipping-aggregator.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Vercel (3 minutes)

#### Option A: Vercel Dashboard (Recommended)

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Sign up or log in
   - Click "Add New" → "Project"

2. **Import Repository**:
   - Connect your GitHub account if prompted
   - Find your `tipping-aggregator` repository
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click "Edit" → Set to `web`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variable**:
   - Click "Environment Variables"
   - Name: `THEODDSAPI_KEY`
   - Value: Paste your API key from Step 1
   - Click "Add"

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your site will be live!

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to web directory
cd web

# Deploy
vercel --prod

# When prompted:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? tipping-aggregator (or your choice)
# - In which directory is your code? ./
# - Override settings? No

# Add environment variable
vercel env add THEODDSAPI_KEY
# Paste your API key when prompted
# Select: Production, Preview, Development (all)

# Redeploy with environment variable
vercel --prod
```

## 🎉 Success! Your Site is Live

After deployment completes, you'll get a URL like:
```
https://tipping-aggregator-abc123.vercel.app
```

### What to Test

1. **Homepage** - Should show EPL/AFL/NRL tabs
2. **Match List** - Click any league tab to see matches
3. **Match Detail** - Click any match to see bookmaker odds
4. **Aggregation** - Verify probabilities and tips display
5. **Mobile** - Test on your phone

## 🔧 Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `odds.yourdomain.com`)
4. Follow DNS configuration instructions
5. Vercel automatically provisions SSL certificate

## 📊 Monitor API Usage

### Check TheOddsAPI Usage

1. Go to https://the-odds-api.com/account
2. View "Requests Remaining" (500/month free tier)
3. Caching keeps usage low (~2-5 requests per page load)

### Check Vercel Usage

1. In Vercel dashboard, click "Usage"
2. Free tier includes:
   - 100GB bandwidth/month
   - Unlimited API calls
   - 100 deployments/day

## 🔄 Update Your Site

Vercel auto-deploys on every git push:

```bash
# Make changes to your code
nano web/src/app/page.tsx

# Commit and push
git add .
git commit -m "Update homepage"
git push

# Vercel automatically deploys in 1-2 minutes
```

## 🐛 Troubleshooting

### Build Fails

**Problem**: Build errors in Vercel logs

**Solution**:
```bash
cd web
npm install
npm run build
# Fix any TypeScript or build errors locally first
```

### Odds Not Loading

**Problem**: Matches show but no odds

**Solutions**:
1. Check `THEODDSAPI_KEY` is set in Vercel environment variables
2. Verify API key is valid at https://the-odds-api.com/account
3. Check you haven't exceeded 500 requests/month
4. View Vercel function logs for error messages

### 404 Errors

**Problem**: Routes don't work

**Solution**:
- Verify Root Directory is set to `web` in Vercel project settings
- Check build completed successfully
- Clear browser cache

### Slow Loading

**Problem**: First load is slow

**Explanation**:
- Cold starts on serverless functions take 2-3 seconds
- Subsequent loads are fast due to caching
- This is normal for serverless architecture

## 📈 Performance Optimization

### Caching Strategy

Already configured:
- Match list: 5 minutes
- Match details: 1 minute
- Leagues: 1 hour

### Reduce API Calls

If approaching 500/month limit:
1. Increase cache duration in `/web/src/app/api/matches/route.ts`
2. Change `s-maxage=300` to `s-maxage=600` (10 minutes)
3. Redeploy

## 🎯 Next Steps

### Recommended

1. **Add custom domain** - Makes it professional
2. **Set up analytics** - Track usage with Vercel Analytics
3. **Share the URL** - Show off your work!

### Future Enhancements

1. **Historical Data** - Add Vercel Postgres to store odds history
2. **More Sports** - Add NBA, NFL, NHL
3. **Notifications** - Alert when odds move
4. **User Accounts** - Save favorite teams

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **TheOddsAPI Docs**: https://the-odds-api.com/liveapi/guides/v4/

## ✅ Deployment Checklist

- [ ] Pushed code to GitHub
- [ ] Created Vercel account
- [ ] Imported repository to Vercel
- [ ] Set Root Directory to `web`
- [ ] Added `THEODDSAPI_KEY` environment variable
- [ ] Deployment succeeded
- [ ] Site loads correctly
- [ ] Matches display with odds
- [ ] Match details work
- [ ] Mobile responsive verified
- [ ] Shared the URL!

## 🎊 You're Live!

Your sports odds aggregator is now running on Vercel with:
- ✅ Live odds from TheOddsAPI
- ✅ Global edge caching
- ✅ Automatic HTTPS
- ✅ Zero infrastructure costs
- ✅ Auto-deployment on push

**Share your URL and enjoy!** 🚀
