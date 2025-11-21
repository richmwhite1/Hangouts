# Seed December & January Events - Production Instructions

This script seeds 10 beautiful events and hangouts for December and January in the production database.

## Prerequisites

1. You need access to your Railway project's `DATABASE_URL`
2. The production database must have at least one user

## How to Get DATABASE_URL from Railway

### Option 1: Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your PostgreSQL database service
4. Go to the "Variables" tab
5. Copy the `DATABASE_URL` value

### Option 2: Railway CLI
```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Get the DATABASE_URL
railway variables
```

## Running the Seed Script

### Method 1: Using Railway CLI (Recommended)
```bash
cd hangouts-3.0
railway run node seed-december-january-events.js
```

### Method 2: Using DATABASE_URL Environment Variable
```bash
cd hangouts-3.0
DATABASE_URL="postgresql://username:password@host:port/database" node seed-december-january-events.js
```

### Method 3: Create a .env file (for local testing)
```bash
cd hangouts-3.0
echo 'DATABASE_URL="postgresql://username:password@host:port/database"' > .env.production
node seed-december-january-events.js
```

## What Gets Created

The script creates 10 items:
- **8 Events** (December and January)
- **2 Hangouts** (December and January)

All items are:
- Set to `PUBLISHED` status
- Set to `PUBLIC` privacy level
- Include beautiful images from Unsplash
- Have realistic descriptions
- Include proper dates, locations, and pricing

## Verification

After running the script, you can verify the events were created by:
1. Visiting https://plans.up.railway.app/
2. Checking the discovery page for the new events
3. The events should appear in December and January

## Troubleshooting

### Error: "No users found in database"
- Make sure you have at least one user in the production database
- The script uses the first active user as the creator

### Error: "DATABASE_URL must start with postgresql://"
- Make sure you're using the PostgreSQL DATABASE_URL from Railway
- The script only works with PostgreSQL (production database)

### Error: Connection timeout
- Check that your Railway database is running
- Verify the DATABASE_URL is correct
- Make sure your IP is allowed (Railway databases are usually accessible from anywhere)




