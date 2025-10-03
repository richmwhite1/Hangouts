# Railway Deployment Guide

## Environment Variables

Set these environment variables in your Railway project:

### Required
- `DATABASE_URL`: SQLite database URL (Railway will provide this)
- `JWT_SECRET`: Your JWT secret key for authentication

### Optional
- `VITE_EVENTBRITE_TOKEN`: Eventbrite API token
- `VITE_EVENTBRITE_API_KEY`: Eventbrite API key
- `VITE_EVENTBRITE_CLIENT_SECRET`: Eventbrite client secret
- `VITE_EVENTBRITE_PUBLIC_TOKEN`: Eventbrite public token

## Database Setup

1. Railway will automatically create a SQLite database
2. The app will run Prisma migrations on startup
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
