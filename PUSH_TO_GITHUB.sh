#!/bin/bash

# Push to GitHub Script
# Run this to push your code to GitHub, then import to Vercel

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📤 PUSH TO GITHUB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository"
    echo "   Initializing git..."
    git init
    git branch -M main
    git add .
    git commit -m "Initial commit: Serverless Sports Odds Aggregator"
fi

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "✅ Git remote 'origin' already exists"
    REMOTE_URL=$(git remote get-url origin)
    echo "   Current remote: $REMOTE_URL"
    echo ""
    read -p "Do you want to keep this remote? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Enter your GitHub repository URL:"
        read -p "URL (https://github.com/USERNAME/REPO.git): " github_url
        git remote remove origin
        git remote add origin "$github_url"
        echo "✅ Remote updated"
    fi
else
    echo "No git remote found. Let's add one!"
    echo ""
    echo "First, create a repository on GitHub:"
    echo "1. Go to: https://github.com/new"
    echo "2. Repository name: tipping-aggregator"
    echo "3. Description: Serverless sports odds aggregator"
    echo "4. Public or Private (your choice)"
    echo "5. DON'T initialize with README/license/gitignore"
    echo "6. Click 'Create repository'"
    echo ""
    read -p "Press Enter when you've created the repository..."
    echo ""

    echo "Enter your GitHub repository URL:"
    echo "Example: https://github.com/yourusername/tipping-aggregator.git"
    read -p "URL: " github_url

    git remote add origin "$github_url"
    echo "✅ Remote added: $github_url"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 REPOSITORY STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show status
git log --oneline -5
echo ""
echo "Total commits: $(git rev-list --count HEAD)"
echo "Current branch: $(git branch --show-current)"
echo ""

# Check if changes are committed
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes"
    echo ""
    git status -s
    echo ""
    read -p "Commit these changes? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 PUSHING TO GITHUB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REMOTE_URL=$(git remote get-url origin)
echo "Pushing to: $REMOTE_URL"
echo ""
read -p "Ready to push? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing to GitHub..."

    if git push -u origin main; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  ✅ SUCCESS! CODE IS ON GITHUB"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your code is now on GitHub at:"
        echo "$REMOTE_URL"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  🎯 NEXT: IMPORT TO VERCEL"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "1. Go to: https://vercel.com/new"
        echo ""
        echo "2. Click 'Import Git Repository'"
        echo ""
        echo "3. Paste your GitHub URL:"
        echo "   $REMOTE_URL"
        echo ""
        echo "4. Configure project:"
        echo "   - Root Directory: web"
        echo "   - Framework Preset: Next.js (auto-detected)"
        echo ""
        echo "5. Add Environment Variable:"
        echo "   - Name: THEODDSAPI_KEY"
        echo "   - Value: [your API key from the-odds-api.com]"
        echo ""
        echo "6. Click 'Deploy'"
        echo ""
        echo "7. Wait 2 minutes... then get your URL! 🎉"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo ""
        echo "❌ Push failed"
        echo ""
        echo "Common issues:"
        echo "1. Authentication required"
        echo "   Solution: Run 'gh auth login' or set up SSH keys"
        echo ""
        echo "2. Repository doesn't exist"
        echo "   Solution: Create it at https://github.com/new"
        echo ""
        echo "3. Wrong remote URL"
        echo "   Solution: Run 'git remote set-url origin https://github.com/USERNAME/REPO.git'"
        echo ""
    fi
else
    echo "Push cancelled"
fi

echo ""
