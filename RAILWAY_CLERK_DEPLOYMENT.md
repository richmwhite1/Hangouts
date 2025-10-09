# Railway Deployment Configuration for Hangouts 3.0 with Clerk Authentication

## Environment Variables Required in Railway Dashboard

### Clerk Authentication (Required)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key_here
CLERK_SECRET_KEY=sk_live_your_production_key_here
```

### Database (Required)
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### Next.js Configuration (Required)
```
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-production-secret-key-here
NODE_ENV=production
PORT=3000
```

### Optional Configuration
```
JWT_SECRET=your-jwt-secret-for-api-routes
JWT_REFRESH_SECRET=your-jwt-refresh-secret
SOCKET_PORT=3001
```

## Setup Instructions

1. **Create Clerk Production Instance:**
   - Go to [clerk.com](https://clerk.com) dashboard
   - Create a new production instance
   - Copy the production keys (pk_live_... and sk_live_...)

2. **Configure Clerk for Production:**
   - Add your Railway domain to Clerk's allowed domains
   - Set up Google OAuth with production redirect URLs
   - Configure any other OAuth providers you need

3. **Set Railway Environment Variables:**
   - In Railway dashboard, go to your project settings
   - Add all the environment variables listed above
   - Make sure to use production values for all keys

4. **Deploy:**
   - Push your code to GitHub
   - Connect Railway to your GitHub repository
   - Railway will automatically deploy when you push changes

## Testing Authentication

After deployment, test the authentication flow:
1. Visit your Railway app URL
2. Try to access a protected route (should redirect to login)
3. Sign in with Google OAuth
4. Verify you can access protected content
5. Test sign out functionality

## Troubleshooting

- **"Clerk not configured" error:** Check that environment variables are set correctly
- **OAuth not working:** Verify redirect URLs in Clerk dashboard match your Railway domain
- **Database errors:** Ensure DATABASE_URL is correctly formatted for PostgreSQL
- **Build failures:** Check that all dependencies are in package.json
