# Railway Deployment Guide

## Database Setup (REQUIRED)

**IMPORTANT**: You must add a PostgreSQL database to your Railway project:

1. **Add PostgreSQL Service**:
   - In your Railway project dashboard
   - Click "New Service" → "Database" → "PostgreSQL"
   - Railway will automatically create a PostgreSQL database

2. **Connect Database to App**:
   - Railway will automatically set the `DATABASE_URL` environment variable
   - The app will use this to connect to PostgreSQL

## Environment Variables

Set these environment variables in your Railway project:

### Required
- `DATABASE_URL`: PostgreSQL database URL (automatically set by Railway)
- `JWT_SECRET`: Your JWT secret key for authentication (set this manually)

### Optional
- `VITE_EVENTBRITE_TOKEN`: Eventbrite API token
- `VITE_EVENTBRITE_API_KEY`: Eventbrite API key
- `VITE_EVENTBRITE_CLIENT_SECRET`: Eventbrite client secret
- `VITE_EVENTBRITE_PUBLIC_TOKEN`: Eventbrite public token

## Database Migration

1. Railway will automatically run Prisma migrations on startup
2. The app will create all necessary tables
3. No manual database setup required

## Build Process

1. `npm ci` - Install dependencies
2. `prisma generate` - Generate Prisma client
3. `next build` - Build Next.js app
4. `npm start` - Start the server

## Notes

- The app uses SQLite for simplicity
- All dependencies are compatible with Railway
- The build process includes Prisma client generation
