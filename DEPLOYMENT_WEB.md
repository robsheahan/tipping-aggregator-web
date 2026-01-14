# Deploying the Documentation Website

The `index.html` file is a self-contained static webpage that serves as:
- Project landing page
- Interactive documentation hub
- Quick reference guide
- Feature showcase

## View Locally

### Option 1: Simple HTTP Server (Recommended)

```bash
# Using the provided script
./serve_docs.sh

# Or manually with Python
python3 -m http.server 8080

# Then open: http://localhost:8080
```

### Option 2: Open Directly in Browser

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Note: Some features work best with an HTTP server.

## Deploy to GitHub Pages

### Method 1: Using GitHub UI (Easiest)

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit: Tipping Aggregator MVP"
git branch -M main
git remote add origin https://github.com/yourusername/tipping-aggregator.git
git push -u origin main
```

3. In GitHub repository settings:
   - Go to **Settings** → **Pages**
   - Source: Select **main** branch
   - Folder: Select **/ (root)**
   - Click **Save**

4. Your site will be available at:
   `https://yourusername.github.io/tipping-aggregator/`

### Method 2: Using gh-pages Branch

```bash
# Create gh-pages branch
git checkout --orphan gh-pages

# Add only the web files
git reset
git add index.html
git commit -m "Deploy documentation site"

# Push to gh-pages
git push origin gh-pages

# Switch back to main
git checkout main
```

Your site will be at: `https://yourusername.github.io/tipping-aggregator/`

## Deploy to Netlify

### Method 1: Drag and Drop (Easiest)

1. Go to https://netlify.com
2. Sign up / Log in
3. Click **Add new site** → **Deploy manually**
4. Drag the `index.html` file to the upload area
5. Site is live instantly!

### Method 2: Connect to Git

1. Push your code to GitHub
2. Go to https://netlify.com
3. Click **Add new site** → **Import from Git**
4. Connect to GitHub and select repository
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: `.` (root)
6. Click **Deploy**

Your site will be at: `https://random-name-123.netlify.app`

You can customize the domain in site settings.

## Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd tipping-aggregator
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (Your account)
# - Link to existing project? No
# - What's your project's name? tipping-aggregator
# - In which directory is your code located? ./
# - Want to override settings? No
```

Site deployed at: `https://tipping-aggregator.vercel.app`

## Deploy to Cloudflare Pages

1. Go to https://pages.cloudflare.com
2. Sign up / Log in
3. Click **Create a project**
4. Connect to GitHub and select repository
5. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
6. Click **Save and Deploy**

## Deploy to AWS S3 + CloudFront

```bash
# Create S3 bucket
aws s3 mb s3://tipping-aggregator-docs

# Enable static website hosting
aws s3 website s3://tipping-aggregator-docs \
  --index-document index.html

# Upload files
aws s3 sync . s3://tipping-aggregator-docs \
  --exclude ".git/*" \
  --exclude "api/*" \
  --exclude "web/*" \
  --include "index.html"

# Make public
aws s3api put-bucket-policy \
  --bucket tipping-aggregator-docs \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tipping-aggregator-docs/*"
    }]
  }'

# Access at:
# http://tipping-aggregator-docs.s3-website-us-east-1.amazonaws.com
```

## Custom Domain Setup

### GitHub Pages

1. Add CNAME file:
```bash
echo "docs.yourdomain.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

2. In your DNS provider, add CNAME record:
```
CNAME docs.yourdomain.com → yourusername.github.io
```

### Netlify

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter your domain
4. Update DNS as instructed

### Vercel

1. Go to **Project settings** → **Domains**
2. Click **Add**
3. Enter your domain
4. Update DNS as instructed

## SSL/HTTPS

All the hosting services above provide **free SSL certificates** automatically:
- GitHub Pages: Enforces HTTPS automatically
- Netlify: Automatic Let's Encrypt SSL
- Vercel: Automatic SSL
- Cloudflare Pages: Automatic SSL
- AWS: Use CloudFront with ACM certificate

## Features of the Landing Page

The `index.html` includes:

✓ **Responsive Design** - Works on mobile, tablet, desktop
✓ **Interactive Sections** - Tabs, smooth scrolling, collapsible content
✓ **Code Examples** - Syntax-highlighted command snippets
✓ **Architecture Diagram** - Visual system overview
✓ **API Documentation** - Endpoint reference
✓ **Quick Start Guide** - Copy-paste setup instructions
✓ **Feature Showcase** - Cards with icons and descriptions
✓ **Statistics Dashboard** - Project metrics
✓ **Command Reference** - Tabbed command library
✓ **Testing Guide** - Comprehensive testing instructions

## Updating the Site

After making changes:

```bash
# GitHub Pages
git add index.html
git commit -m "Update documentation"
git push

# Netlify (automatic from git push)
# Or drag and drop new index.html

# Vercel
vercel --prod

# AWS S3
aws s3 cp index.html s3://tipping-aggregator-docs/
```

## SEO Optimization

The page includes:
- ✓ Title tag
- ✓ Meta description
- ✓ Semantic HTML
- ✓ Responsive viewport
- ✓ Clean URLs

For better SEO, consider adding:
- Sitemap.xml
- Robots.txt
- Open Graph tags
- Twitter Card tags
- Analytics (Google Analytics, Plausible, etc.)

## Analytics Setup

### Google Analytics

Add before `</head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Plausible (Privacy-Friendly)

Add before `</head>`:
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## Performance

The page is optimized for performance:
- ✓ Single HTML file (no dependencies)
- ✓ Inline CSS (no external stylesheets)
- ✓ Inline JavaScript (no external scripts)
- ✓ No images (uses emoji/text)
- ✓ Lazy loading ready
- ✓ Mobile-first responsive design

Page size: ~50KB (loads instantly)

## Browser Support

Works in all modern browsers:
- ✓ Chrome/Edge (latest 2 versions)
- ✓ Firefox (latest 2 versions)
- ✓ Safari (latest 2 versions)
- ✓ Mobile browsers (iOS Safari, Chrome Android)

## Customization

The page is easy to customize:

### Change Colors

Edit the CSS section in `<style>`:
```css
/* Primary color (purple) */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to blue */
background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
```

### Add Your Logo

Replace emoji in hero:
```html
<h1>⚽ Tipping Aggregator</h1>

<!-- With image -->
<h1><img src="logo.png" alt="Logo" height="50"> Tipping Aggregator</h1>
```

### Add New Sections

Copy any existing section and modify:
```html
<div class="section" id="new-section">
    <h2>🎯 New Section</h2>
    <p>Your content here...</p>
</div>
```

## Troubleshooting

### Styles Not Loading
- Check the `<style>` tag is present
- Ensure no CSS syntax errors
- View browser console for errors

### Links Not Working
- Verify anchor IDs match href values
- Check smooth scroll JavaScript is present

### Can't View Locally
- Use an HTTP server (don't open file:// directly)
- Try: `python3 -m http.server 8080`

## Next Steps

After deploying:

1. Share the URL with your team
2. Add the URL to your GitHub repository description
3. Link to it from your README.md
4. Submit to relevant directories
5. Share on social media

## Support

For issues with:
- **GitHub Pages**: https://docs.github.com/pages
- **Netlify**: https://docs.netlify.com
- **Vercel**: https://vercel.com/docs
- **Cloudflare Pages**: https://developers.cloudflare.com/pages

---

**Your documentation site is ready to deploy!** 🚀

Choose any hosting option above and your site will be live in minutes.
