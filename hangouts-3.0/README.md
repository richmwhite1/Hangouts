# Hangouts 3.0

A modern social hangout planning application built with Next.js 14, TypeScript, and PostgreSQL.

## Features

- 🔐 **Authentication**: JWT-based sign up/sign in
- 📱 **Mobile-First Design**: Responsive UI with bottom navigation
- 🌙 **Dark Theme**: Beautiful dark mode support
- 👥 **Friends System**: Instagram-like friend management
- 🎉 **Hangout Planning**: Create and manage group activities
- 📍 **Location Integration**: Free geocoding and maps
- ⚡ **Real-time Updates**: Socket.io for live notifications
- 🔔 **Smart Notifications**: Customizable notification preferences

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io
- **Validation**: Zod schemas
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   # Create PostgreSQL database
   createdb hangouts_3_0
   
   # Push schema to database
   npx prisma db push
   ```

3. **Environment variables:**
   The `.env` file is already configured with:
   - Database connection
   - JWT secrets
   - Socket.io settings

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoints
│   ├── dashboard/         # Dashboard page
│   ├── signin/           # Sign in page
│   ├── signup/           # Sign up page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── auth/             # Authentication forms
│   └── layout/           # Layout components
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication utilities
│   ├── db.ts            # Database connection
│   ├── socket.ts        # Socket.io client
│   └── validations.ts   # Zod schemas
└── prisma/              # Database schema
    └── schema.prisma    # Prisma schema
```

## Development Phases

### ✅ Phase 1: Foundation & Authentication (COMPLETED)
- Project setup with Next.js 14 + TypeScript
- PostgreSQL database with Prisma ORM
- JWT authentication system
- Mobile-first UI with dark theme
- Bottom navigation layout
- Socket.io integration

### 🔄 Next: Phase 2: Friends System
- Friend request system
- Friends list and management
- Notification system foundation
- User profiles

### 📋 Upcoming Phases
- Core hangout creation and management
- RSVP system with real-time updates
- Invitation system
- Optional features (tasks, itinerary)
- Real-time communication
- Social feed foundation

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in user
- `GET /api/auth/me` - Get current user

## Database Schema

The application uses a comprehensive PostgreSQL schema with:
- Users and authentication
- Friends and friend requests
- Hangouts and participants
- Notifications and preferences
- Tasks and itinerary (optional features)
- Messages and memories (social features)

## Contributing

1. Follow the mobile-first design principles
2. Use TypeScript for all new code
3. Follow the existing component structure
4. Test authentication flows thoroughly
5. Ensure responsive design on mobile devices

## License

MIT License - see LICENSE file for details