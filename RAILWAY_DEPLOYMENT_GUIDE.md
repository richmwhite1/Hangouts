# Railway Deployment Guide

## ✅ FIXED: Database Configuration Issues

### 1. Environment Variables Required in Railway

Set these environment variables in your Railway project:

```bash
# Required
DATABASE_URL=postgresql://... (Railway will provide this automatically)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=https://hangouts-production-adc4.up.railway.app
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production
NODE_ENV=production
PORT=3000

# Optional
SOCKET_IO_PORT=3001
MAX_FILE_SIZE=5242880
UPLOAD_DIR=public/uploads/images
```

### 2. Database Configuration Fixed

- ✅ Updated Prisma schema to use PostgreSQL instead of SQLite
- ✅ Added automatic database migration on deployment
- ✅ Added production seed script with test users
- ✅ Fixed database connection issues

### 3. Test Users Created

The following test users will be created automatically:

| Email | Username | Password | Name |
|-------|----------|----------|------|
| richard@example.com | richard | Password1! | Richard White |
| hillary@example.com | hillaryclinton | Password1! | Hillary Clinton |
| ted@example.com | tedjohnson | Password1! | Ted Johnson |
| bill@example.com | billbev | Password1! | Bill Beverly |
| sarah@example.com | sarahsmith | Password1! | Sarah Smith |
| mike@example.com | mikejones | Password1! | Mike Jones |

### 4. Features to Test

1. **Sign In**: Use any of the test users above
2. **Friends System**: Users can see each other and add/remove friends
3. **Hangout Creation**: Create new hangouts
4. **Polling**: Create and vote on polls
5. **RSVP**: RSVP to hangouts
6. **Messaging**: Send messages between users

### 5. Deployment Process

1. Railway automatically runs `prisma db push` to create tables
2. Railway runs the seed script to create test users
3. App starts with `next start`
4. Health check at `/api/health` verifies deployment

### 6. Manual Health Check

Test the health check:
```bash
curl https://hangouts-production-adc4.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "port": "8080",
  "version": "v18.20.5"
}
```
