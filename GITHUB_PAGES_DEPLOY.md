# 🚀 Deploy to GitHub Pages - Complete Guide

Your repository is ready! Follow these steps to deploy to GitHub Pages.

## ✅ What's Already Done

✓ Git repository initialized
✓ Branch renamed to 'main'
✓ All 86 files staged
✓ Initial commit created (10,376 lines)
✓ Repository ready to push

## 📋 Deployment Steps

### Step 1: Create GitHub Repository (2 minutes)

1. **Go to GitHub**: https://github.com/new

2. **Repository Settings**:
   - **Name**: `tipping-aggregator` (or your preferred name)
   - **Description**: `Production-ready sports tipping aggregator with dynamic weighting and probability aggregation`
   - **Visibility**: Public (required for free GitHub Pages)
   - **Do NOT initialize** with README, .gitignore, or license (we already have these)

3. **Click "Create repository"**

### Step 2: Push to GitHub (1 minute)

Copy the commands from GitHub's "push an existing repository" section, which look like:

```bash
cd /home/robsheahan/tipping-aggregator

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/tipping-aggregator.git

# Push to GitHub
git push -u origin main
```

**Example:**
```bash
# If your username is "johndoe"
git remote add origin https://github.com/johndoe/tipping-aggregator.git
git push -u origin main
```

You'll be prompted for your GitHub credentials or personal access token.

### Step 3: Enable GitHub Pages (1 minute)

1. **Go to repository Settings**:
   - Navigate to your repository on GitHub
   - Click **Settings** tab (top right)

2. **Navigate to Pages**:
   - In the left sidebar, click **Pages** (under "Code and automation")

3. **Configure GitHub Pages**:
   - **Source**: Select **Deploy from a branch**
   - **Branch**: Select **main**
   - **Folder**: Select **/ (root)**
   - Click **Save**

4. **Wait for deployment** (1-2 minutes):
   - GitHub will build and deploy your site
   - A blue banner will appear: "Your site is ready to be published at..."
   - Refresh the page after ~2 minutes
   - Banner turns green: "Your site is live at..."

### Step 4: Access Your Site!

Your documentation website will be live at:

```
https://YOUR_USERNAME.github.io/tipping-aggregator/
```

Example: `https://johndoe.github.io/tipping-aggregator/`

## 🎉 What You'll See

Once deployed, your site includes:

- 🌐 **Beautiful landing page** with purple gradient hero
- 📊 **Statistics dashboard** (79 files, 7.2K lines, etc.)
- ⚡ **Quick start guide** with copy-paste commands
- 🎯 **Feature showcase** with interactive cards
- 🏗️ **Architecture diagram** showing system design
- 🔌 **API documentation** with endpoint examples
- 🧮 **Algorithm explanations** (Brier score, weighting, etc.)
- 🧪 **Testing guides** and checklists
- 📚 **Links to all documentation**
- 💻 **Command reference** with interactive tabs
- 📱 **Fully responsive** (works on mobile/tablet/desktop)

## 🔧 Customize Your Site (Optional)

### Add Custom Domain

1. **In your DNS provider**, add a CNAME record:
   ```
   docs.yourdomain.com → YOUR_USERNAME.github.io
   ```

2. **In GitHub Pages settings**:
   - Enter your custom domain: `docs.yourdomain.com`
   - Check "Enforce HTTPS"
   - Save

### Update Repository Description

1. Go to repository main page
2. Click **About** (gear icon)
3. Add website: `https://YOUR_USERNAME.github.io/tipping-aggregator/`
4. Add topics: `sports-betting`, `odds-aggregation`, `fastapi`, `nextjs`, `python`, `typescript`
5. Save

### Add Social Preview

Create a preview image (1200×630px) showing your landing page:
1. Repository Settings → General → Social preview
2. Upload image
3. Visitors will see this when sharing on social media

## 📤 Update the Site

Whenever you make changes:

```bash
# Make your changes to index.html or other files
nano index.html

# Stage changes
git add .

# Commit
git commit -m "Update documentation"

# Push to GitHub
git push

# Site updates automatically in 1-2 minutes
```

## 🌟 Share Your Site

Now that it's live, share it:

```markdown
### 📖 Documentation
View the complete documentation at:
https://YOUR_USERNAME.github.io/tipping-aggregator/

### 🚀 Quick Start
Follow the [documentation](https://YOUR_USERNAME.github.io/tipping-aggregator/#quickstart) to get started in 5 minutes.
```

Add this to your README.md:

```bash
# Update README.md
cat >> README.md << 'EOF'

## 🌐 Live Documentation

View the interactive documentation website:
**[https://YOUR_USERNAME.github.io/tipping-aggregator/](https://YOUR_USERNAME.github.io/tipping-aggregator/)**

Features:
- Interactive API documentation
- Complete setup guides
- Architecture diagrams
- Code examples
- Testing checklists

EOF

# Commit and push
git add README.md
git commit -m "Add documentation website link"
git push
```

## 🔍 Verify Deployment

### Check Deployment Status

1. Go to repository **Actions** tab
2. Look for "pages build and deployment" workflow
3. Should show green checkmark ✓

### Test Your Site

```bash
# Test locally first
curl -I https://YOUR_USERNAME.github.io/tipping-aggregator/

# Should return:
# HTTP/2 200
# content-type: text/html
```

### Common URLs

Once deployed, these will work:

```
Main page:
https://YOUR_USERNAME.github.io/tipping-aggregator/

Direct sections (with smooth scrolling):
https://YOUR_USERNAME.github.io/tipping-aggregator/#quickstart
https://YOUR_USERNAME.github.io/tipping-aggregator/#features
https://YOUR_USERNAME.github.io/tipping-aggregator/#api
https://YOUR_USERNAME.github.io/tipping-aggregator/#testing
```

## 📊 GitHub Pages Features

Your site automatically gets:

✓ **Free HTTPS** - Automatic SSL certificate
✓ **CDN** - Fast loading worldwide
✓ **Automatic deployment** - Updates on every push
✓ **Custom domain support** - Use your own domain
✓ **99.9% uptime** - Reliable hosting
✓ **Bandwidth** - Generous limits for docs sites

## 🐛 Troubleshooting

### Site Not Updating?

```bash
# Check if push succeeded
git log --oneline -1

# Force refresh deployment
git commit --allow-empty -m "Trigger rebuild"
git push
```

### 404 Error?

1. Check branch is `main` (not `master`)
2. Check folder is `/` (root)
3. Ensure `index.html` exists in root
4. Wait 2 minutes for deployment

### Custom Domain Not Working?

1. Verify DNS CNAME record is correct
2. Wait for DNS propagation (up to 24 hours)
3. Check GitHub Pages shows your domain
4. Enable "Enforce HTTPS"

### Build Failed?

1. Go to Actions tab
2. Click failed workflow
3. Check error message
4. Usually: invalid HTML syntax

## 📈 Analytics (Optional)

### Add Google Analytics

Edit `index.html`, add before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

Then push:
```bash
git add index.html
git commit -m "Add Google Analytics"
git push
```

### Add Plausible Analytics (Privacy-Friendly)

Edit `index.html`, add before `</head>`:

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## 🎯 Next Steps

After deployment:

1. ✅ **Test the site** - Click all links, test all sections
2. ✅ **Share the URL** - Add to README, social media, portfolio
3. ✅ **Add topics** - Tag your repo for discoverability
4. ✅ **Star your repo** - Makes it easier to find later
5. ✅ **Watch repo** - Get notified of issues

## 📝 Example Deployment

Here's what the full process looks like:

```bash
# Already done (but shown for reference)
cd tipping-aggregator
git init
git branch -m main
git add .
git commit -m "Initial commit: Tipping Aggregator MVP"

# You need to do these steps
git remote add origin https://github.com/YOUR_USERNAME/tipping-aggregator.git
git push -u origin main

# Then enable GitHub Pages in Settings → Pages
# Select: main branch, / (root)
# Wait 2 minutes

# Site live at:
# https://YOUR_USERNAME.github.io/tipping-aggregator/
```

## ✅ Deployment Checklist

- [ ] Created GitHub repository
- [ ] Pushed code to GitHub (`git push -u origin main`)
- [ ] Enabled GitHub Pages in Settings
- [ ] Selected `main` branch and `/` (root) folder
- [ ] Waited 2 minutes for deployment
- [ ] Visited site URL (https://YOUR_USERNAME.github.io/tipping-aggregator/)
- [ ] Site loads correctly
- [ ] All sections work
- [ ] Smooth scrolling works
- [ ] Mobile responsive (test on phone)
- [ ] Added website to repository About section
- [ ] Updated README.md with site link
- [ ] Shared with others!

## 🎊 Success!

Your documentation website is now live on GitHub Pages!

**URL**: `https://YOUR_USERNAME.github.io/tipping-aggregator/`

Anyone can now:
- View your documentation
- See the architecture
- Read the API docs
- Follow setup guides
- Copy commands to run locally

**Share it everywhere!** 🚀

---

## 📞 Need Help?

- **GitHub Pages Docs**: https://docs.github.com/pages
- **Check Deployment**: Repository → Actions tab
- **Common Issues**: See troubleshooting section above
- **Force Rebuild**: Push empty commit

**Your site is ready to go live!** 🎉
