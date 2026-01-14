# 🚀 GET YOUR LIVE URL IN 5 MINUTES

## Copy this folder to your computer, then run ONE command:

```bash
./DEPLOY_NOW.sh
```

That's it! The script does everything automatically.

---

## What it does:

1. ✅ Checks you have Node.js
2. ✅ Asks for your API key (get free at https://the-odds-api.com/)
3. ✅ Installs dependencies
4. ✅ Logs you into Vercel (opens browser)
5. ✅ Deploys your site
6. ✅ Gives you the live URL

## Requirements:

- Node.js 18+ ([download here](https://nodejs.org/))
- TheOddsAPI key ([get free here](https://the-odds-api.com/))
- 5 minutes

---

## Step by Step:

### 1. Copy this folder to your computer

Use your file browser or:
```bash
# If you're on the remote server, copy to your local machine
scp -r /home/robsheahan/tipping-aggregator ~/Desktop/
```

### 2. Open terminal in the folder

```bash
cd ~/Desktop/tipping-aggregator
# Or wherever you copied it
```

### 3. Run the deployment script

```bash
./DEPLOY_NOW.sh
```

### 4. Follow the prompts:

- **API Key**: Paste your key from https://the-odds-api.com/
- **Vercel Login**: Browser will open, sign up (free)
- **Deploy**: Wait 2-3 minutes

### 5. Get your URL!

The script will show your live URL like:
```
https://tipping-aggregator-abc123.vercel.app
```

---

## Alternative: Manual Deployment (if script doesn't work)

### Option 1: Vercel Dashboard (Easiest)

1. Go to https://vercel.com
2. Sign up (free)
3. Click "Import Project"
4. Upload the `web` folder
5. Add environment variable: `THEODDSAPI_KEY=your_key`
6. Click "Deploy"
7. Get your URL!

### Option 2: Vercel CLI

```bash
cd web
npm install
npm install -g vercel
vercel login
vercel --prod
```

When asked for environment variables:
```
vercel env add THEODDSAPI_KEY
# Paste your API key
```

---

## Can't run it yourself? Here's what you need:

Send these to someone who can deploy for you:

1. **This folder**: `tipping-aggregator/`
2. **Your API key**: Get from https://the-odds-api.com/
3. **Instructions**: Point them to this file

They can run `./DEPLOY_NOW.sh` and get you the URL.

---

## Why can't Claude deploy it?

Claude is running in a sandboxed environment and can't:
- Access your Vercel account
- Store your API key
- Deploy to external services
- Create the live URL

But the automated script makes it super easy for you! 🚀

---

## Need help?

1. Make sure Node.js is installed: `node --version`
2. Make sure you have your API key from https://the-odds-api.com/
3. Run `./DEPLOY_NOW.sh` and follow prompts
4. Check DEPLOY_TO_VERCEL.md for detailed guide

---

**You're 5 minutes away from your live sports odds website!** 🎉
