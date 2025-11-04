# Production Database Connection Fixes

## Critical Issues Fixed

### 1. Database Connection Logic (src/lib/db.ts)
**Problem**: The database connection logic only supported SQLite and would break PostgreSQL connections in production.

**Solution**: Updated the connection logic to properly handle both SQLite (local) and PostgreSQL (production):
- Added check for PostgreSQL URLs (`postgresql://` or `postgres://`)
- Only apply SQLite file path normalization for non-PostgreSQL databases
- Added connection type logging for debugging

```typescript
// Only normalize SQLite file URLs in development
// PostgreSQL URLs (postgresql://) should pass through unchanged
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  // SQLite normalization logic here
}
```

### 2. Prisma Schema Configuration
**Files**: `prisma/schema.prisma` vs `prisma/schema-production.prisma`

**Problem**: 
- Local schema uses `provider = "sqlite"` 
- Production schema uses `provider = "postgresql"`
- Missing `clerkId` field in User model after migrations

**Solution**:
- Added `clerkId String? @unique` field to User model
- Keep `prisma/schema.prisma` with `provider = "sqlite"` for local development
- Keep `prisma/schema-production.prisma` with `provider = "postgresql"` for production
- Railway should use environment variable `DATABASE_URL` which will have PostgreSQL connection string

### 3. Production Database Setup Checklist

#### Railway Environment Variables (CRITICAL)
Ensure these are set in Railway:
```
DATABASE_URL=postgresql://... (set automatically by Railway when you add PostgreSQL)
NODE_ENV=production
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable
```

#### Database Schema Provider
For production deployment, you need to:

1. **Option A: Use schema-production.prisma (Recommended)**
   ```bash
   # In your Railway build process or deploy script
   cp prisma/schema-production.prisma prisma/schema.prisma
   npx prisma generate
   npx prisma migrate deploy
   ```

2. **Option B: Update schema.prisma provider before deployment**
   Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

#### Migration Steps for Production

1. **Deploy schema to Railway**:
   ```bash
   # Make sure schema uses postgresql provider
   # Then run migrations
   railway run npx prisma migrate deploy
   ```

2. **Verify database connection**:
   ```bash
   # Test that app can connect
   railway run node test-production-db.js
   ```

3. **Seed production data** (if needed):
   ```bash
   railway run npm run db:seed:production
   ```

### 4. Local Development Setup

For local development with SQLite:
```bash
# Ensure schema.prisma has sqlite provider
# Run migrations
npx prisma db push

# Seed local data
npm run db:seed
```

## Testing Checklist

### Local Testing ✅
- [x] Database connection works with SQLite
- [x] Migrations applied successfully
- [x] clerkId field added to User model
- [x] Seed script runs without errors
- [x] App loads and displays content
- [x] API endpoints return data

### Production Testing (Todo)
- [ ] Verify DATABASE_URL in Railway is PostgreSQL
- [ ] Confirm schema provider is set to postgresql
- [ ] Run migrations on production database
- [ ] Test API endpoints return data
- [ ] Verify hangouts/events load in production
- [ ] Test authenticated user flows
- [ ] Verify friends system works

## Files Changed

1. `src/lib/db.ts` - Fixed database connection logic
2. `prisma/schema.prisma` - Added clerkId field
3. `src/app/api/feed-simple/route.ts` - Removed invalid status field queries
4. `src/app/api/auth/me/route.ts` - Handle unauthenticated users gracefully
5. `test-production-db.js` - Created database testing script
6. `test-production-api.js` - Created API testing script

## Production URL Testing

Current production URL: `https://hangouts.up.railway.app`

**Status**: Returns 404 "Application not found"

**Possible Causes**:
1. App not deployed to Railway
2. Deployment failed
3. Wrong URL
4. App crashed on startup due to database connection issues

**Next Steps**:
1. Check Railway dashboard for deployment status
2. Verify build logs for errors
3. Confirm DATABASE_URL is set correctly
4. Test with updated production URL if different
5. Run migrations if database is empty

## Deployment Command for Railway

If deploying manually or via CI/CD, ensure this order:
```bash
# 1. Install dependencies
npm ci

# 2. Copy production schema (if using schema-production.prisma)
cp prisma/schema-production.prisma prisma/schema.prisma

# 3. Generate Prisma client
npx prisma generate

# 4. Build application
npm run build

# 5. Run migrations
npx prisma migrate deploy

# 6. Start application
npm run start
```

## Common Issues & Solutions

### Issue: "provider doesn't match migration_lock.toml"
**Solution**: Delete migrations folder if switching between SQLite and PostgreSQL:
```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

### Issue: "Unknown argument clerkId"
**Solution**: Regenerate Prisma client after schema changes:
```bash
npx prisma generate
```

### Issue: Production returns empty data
**Solutions**:
1. Check DATABASE_URL is PostgreSQL, not SQLite
2. Verify migrations have been run
3. Check database has data (use test-production-db.js)
4. Verify API endpoints are not filtering out all content

### Issue: "Application not found" in production
**Solutions**:
1. Verify correct production URL
2. Check Railway deployment status
3. Review build/deploy logs for errors
4. Ensure app is actually running (not crashed)

