# Railway Deployment Guide

## Quick Fix for Health Check Issues

### 1. Environment Variables Required in Railway

Set these environment variables in your Railway project:

```bash
# Required
DATABASE_URL=postgresql://... (Railway will provide this automatically)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=https://your-app-name.railway.app
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production
NODE_ENV=production
PORT=3000

# Optional
SOCKET_IO_PORT=3001
MAX_FILE_SIZE=5242880
UPLOAD_DIR=public/uploads/images
```

### 2. Health Check Configuration

The health check endpoint `/api/health` has been simplified to avoid database operations that might cause timeouts.

### 3. Database Setup

1. Add a PostgreSQL database to your Railway project
2. Railway will automatically set the `DATABASE_URL` environment variable
3. Run database migrations after deployment:
   ```bash
   npm run db:migrate
   ```

### 4. Build Configuration

The app now uses standard Next.js production mode (`next start`) instead of the custom server.

### 5. Troubleshooting

If the health check still fails:

1. Check Railway logs for any startup errors
2. Ensure all environment variables are set
3. Verify the database connection is working
4. Check if the app is listening on the correct port

### 6. Manual Health Check

You can test the health check manually:
```bash
curl https://your-app-name.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "port": "3000",
  "version": "v18.17.0"
}
```
