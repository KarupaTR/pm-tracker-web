# PM Task Tracker — Web App (Vercel)

## Deploy in 5 steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/pm-tracker-web.git
git push -u origin main
```

### 2. Deploy on Vercel
- Go to vercel.com → New Project → Import your GitHub repo
- Click Deploy (uses Next.js auto-detection)

### 3. Set Environment Variables in Vercel dashboard
```
AZURE_CLIENT_ID      = your-azure-client-id
AZURE_TENANT_ID      = 62ccb864-6a1a-4b5d-8e1c-397dec1a8258
AZURE_CLIENT_SECRET  = your-azure-client-secret
SESSION_SECRET       = any-random-32-char-string
NEXTAUTH_URL         = https://your-app.vercel.app
```

### 4. Update Azure Redirect URI
In Azure Portal → your app → Authentication → add:
`https://your-app.vercel.app/api/auth/callback`

### 5. Open your app and click "Connect Microsoft 365"

## Notes
- Task data stored in browser localStorage — no database needed
- No Anthropic key needed — uses built-in rule-based extraction
- Auto-syncs every 30 minutes when the page is open
