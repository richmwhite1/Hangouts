# Clerk Authentication Setup Instructions

## 🚨 IMPORTANT: Replace Placeholder Keys

Your app is configured with Clerk authentication but currently uses placeholder keys. To make it work:

### 1. Get Real Clerk Keys

1. Go to [clerk.com](https://clerk.com) and sign up/login
2. Create a new application
3. Choose "Next.js" as your framework
4. Copy your keys from the dashboard:
   - **Publishable Key** (starts with `pk_test_...`)
   - **Secret Key** (starts with `sk_test_...`)

### 2. Update Environment Variables

Replace the placeholder values in `.env.local`:

```bash
# Replace these with your real Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_real_key_here
CLERK_SECRET_KEY=sk_test_your_real_key_here
```

### 3. Configure Google OAuth (Optional)

1. In Clerk dashboard, go to "Authentication" → "Social connections"
2. Click "Add connection" → Select "Google"
3. Follow Google OAuth setup instructions
4. Add your domain to authorized redirect URIs

### 4. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000` and test the authentication flow.

### 5. Deploy to Railway

Once local testing works:

1. **Create Clerk Production Instance:**
   - In Clerk dashboard, click "Development" → "Create production instance"
   - Copy production keys (pk_live_... and sk_live_...)

2. **Set Railway Environment Variables:**
   - Go to Railway dashboard → Your project → Variables
   - Add these variables:
     ```
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
     CLERK_SECRET_KEY=sk_live_your_production_key
     DATABASE_URL=postgresql://username:password@host:port/database
     NEXTAUTH_URL=https://your-app.railway.app
     NEXTAUTH_SECRET=your-production-secret
     NODE_ENV=production
     ```

3. **Configure Clerk for Production:**
   - Add your Railway domain to Clerk's allowed domains
   - Update OAuth redirect URLs for production

4. **Deploy:**
   - Push your code to GitHub
   - Railway will automatically deploy

## ✅ What's Already Configured

- ✅ ClerkProvider in layout.tsx
- ✅ Authentication middleware
- ✅ Login/signup pages with dark theme
- ✅ Protected routes
- ✅ Railway deployment configuration
- ✅ Build scripts and dependencies

## 🔧 Troubleshooting

- **"Clerk not configured"**: Check environment variables
- **OAuth not working**: Verify redirect URLs in Clerk dashboard
- **Build failures**: Ensure all keys are valid (not placeholders)
- **Deployment issues**: Check Railway environment variables

## 📚 Next Steps

1. Get your Clerk keys and update `.env.local`
2. Test locally with `npm run dev`
3. Create production instance in Clerk
4. Deploy to Railway with production keys
5. Test authentication flow in production

Your app is ready for deployment once you add real Clerk keys!
