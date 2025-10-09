# 🚀 Clerk Authentication Migration Implementation Prompt

## Prerequisites
- Working Hangouts 3.0 app (current state)
- Clerk account setup
- Database backup completed
- Git backup branch created

## Implementation Steps

### Step 1: Install Clerk and Setup Environment

```bash
# Install Clerk
cd "/Users/richardwhite/Hangout 3.0/hangouts-3.0"
npm install @clerk/nextjs

# Add to .env.local (replace with your actual Clerk keys)
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here" >> .env.local
echo "CLERK_SECRET_KEY=sk_test_your_key_here" >> .env.local
echo "CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret" >> .env.local
```

### Step 2: Database Schema Update

```bash
# Create migration for Clerk ID
npx prisma migrate dev --name add-clerk-id
```

Update `prisma/schema.prisma`:
```prisma
model User {
  id                       String                    @id @default(cuid())
  clerkId                  String?                   @unique  // New field
  email                    String                    @unique
  username                 String                    @unique
  name                     String
  avatar                   String?
  backgroundImage          String?
  bio                      String?
  location                 String?
  zodiac                   String?
  enneagram                String?
  bigFive                  String?
  loveLanguage             String?
  website                  String?
  birthDate                DateTime?
  favoriteActivities       String?                    @default("[]")
  favoritePlaces           String?                    @default("[]")
  password                 String?                   // Make optional for migration
  role                     UserRole                  @default(USER)
  isActive                 Boolean                   @default(true)
  isVerified               Boolean                   @default(false)
  lastSeen                 DateTime                  @default(now())
  createdAt                DateTime                  @default(now())
  updatedAt                DateTime                  @updatedAt
  // ... rest of relations
}
```

### Step 3: Create Clerk Integration Files

Create `src/lib/clerk-auth.ts`:
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from './db'

export async function getClerkApiUser() {
  const { userId } = auth()
  if (!userId) return null
  
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { 
      id: true, 
      email: true, 
      username: true, 
      name: true, 
      role: true,
      avatar: true,
      isActive: true
    }
  })
  
  return user
}

export async function getClerkUserData() {
  const user = await currentUser()
  if (!user) return null
  
  return {
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    username: user.username,
    name: `${user.firstName} ${user.lastName}`.trim(),
    avatar: user.imageUrl,
    isVerified: user.emailAddresses[0]?.verification?.status === 'verified'
  }
}

export async function syncClerkUserToDatabase(clerkUser: any) {
  const userData = {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    username: clerkUser.username,
    name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
    avatar: clerkUser.imageUrl,
    isVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
    isActive: true
  }
  
  // Check if user exists by email
  const existingUser = await db.user.findUnique({
    where: { email: userData.email }
  })
  
  if (existingUser) {
    // Update existing user with Clerk ID
    return await db.user.update({
      where: { id: existingUser.id },
      data: { clerkId: userData.clerkId }
    })
  } else {
    // Create new user
    return await db.user.create({
      data: userData
    })
  }
}
```

Create `src/lib/clerk-api-middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from './clerk-auth'

export async function withClerkAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { userId } = auth()
      
      if (!userId) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          message: 'No valid authentication token provided'
        }, { status: 401 })
      }
      
      const user = await getClerkApiUser()
      
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found',
          message: 'User account not found in database'
        }, { status: 404 })
      }
      
      if (!user.isActive) {
        return NextResponse.json({
          success: false,
          error: 'Account disabled',
          message: 'User account is inactive'
        }, { status: 403 })
      }
      
      return await handler(req, user)
    } catch (error) {
      console.error('Clerk auth middleware error:', error)
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      }, { status: 500 })
    }
  }
}
```

### Step 4: Create Clerk Webhook Handler

Create `src/app/api/webhooks/clerk/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { syncClerkUserToDatabase } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }
  
  const headerPayload = req.headers
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }
  
  const payload = await req.text()
  const body = JSON.parse(payload)
  
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: any
  
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }
  
  const { type, data } = evt
  
  switch (type) {
    case 'user.created':
      try {
        await syncClerkUserToDatabase(data)
        console.log('User created and synced:', data.id)
      } catch (error) {
        console.error('Error syncing user creation:', error)
      }
      break
      
    case 'user.updated':
      try {
        const user = await db.user.findUnique({
          where: { clerkId: data.id }
        })
        
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              email: data.email_addresses[0]?.email_address,
              username: data.username,
              name: `${data.first_name} ${data.last_name}`.trim(),
              avatar: data.image_url,
              isVerified: data.email_addresses[0]?.verification?.status === 'verified'
            }
          })
          console.log('User updated:', data.id)
        }
      } catch (error) {
        console.error('Error updating user:', error)
      }
      break
      
    case 'user.deleted':
      try {
        const user = await db.user.findUnique({
          where: { clerkId: data.id }
        })
        
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { isActive: false }
          })
          console.log('User deactivated:', data.id)
        }
      } catch (error) {
        console.error('Error deactivating user:', error)
      }
      break
  }
  
  return NextResponse.json({ message: 'Webhook processed' })
}
```

### Step 5: Update Layout with ClerkProvider

Update `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/contexts/auth-context'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-background text-foreground dark">
            <main className="container mx-auto px-4 py-6 max-w-4xl">
              <AuthProvider>
                <RealtimeProvider>
                  <WebSocketProvider>
                    {children}
                  </WebSocketProvider>
                </RealtimeProvider>
              </AuthProvider>
            </main>
            <BottomNavigation />
          </div>
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### Step 6: Update Auth Context for Dual Support

Update `src/contexts/auth-context.tsx`:
```typescript
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs'
import { apiClient, User, SignInData, SignUpData } from '@/lib/api-client'

interface AuthContextType {
  user: User | null
  token: string | null
  isClerkUser: boolean
  signIn: (data: SignInData) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => void
  clearAuthState: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isSignedIn, getToken } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClerkUser, setIsClerkUser] = useState(false)

  const isAuthenticated = !!user && (!!token || isSignedIn)

  const clearAuthState = () => {
    setUser(null)
    setToken(null)
    setIsClerkUser(false)
    apiClient.setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSignedIn && clerkUser) {
          // Clerk authentication
          setIsClerkUser(true)
          
          // Get Clerk token
          const clerkToken = await getToken()
          if (clerkToken) {
            setToken(clerkToken)
            apiClient.setToken(clerkToken)
          }
          
          // Sync user with database
          const response = await fetch('/api/auth/sync-clerk-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clerkToken}`
            },
            body: JSON.stringify({
              clerkId: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress,
              username: clerkUser.username,
              name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
              avatar: clerkUser.imageUrl
            })
          })
          
          if (response.ok) {
            const { user: syncedUser } = await response.json()
            setUser(syncedUser)
          }
        } else {
          // Check for legacy JWT authentication
          const storedToken = localStorage.getItem('auth_token')
          const storedUser = localStorage.getItem('auth_user')
          
          if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
            try {
              const parsedUser = JSON.parse(storedUser)
              apiClient.setToken(storedToken)
              
              const testResponse = await apiClient.get('/api/auth/me')
              if (testResponse.success) {
                setToken(storedToken)
                setUser(parsedUser)
                setIsClerkUser(false)
              } else {
                clearAuthState()
              }
            } catch (error) {
              console.error('Auth: Token validation error:', error)
              clearAuthState()
            }
          }
        }
      } catch (error) {
        console.error('Auth: Initialization error:', error)
        clearAuthState()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [isSignedIn, clerkUser, getToken])

  const signIn = async (data: SignInData) => {
    try {
      setIsLoading(true)
      const { user, token } = await apiClient.signIn(data)
      
      setUser(user)
      setToken(token)
      setIsClerkUser(false)
      apiClient.setToken(token)
      
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      setIsLoading(true)
      const { user, token } = await apiClient.signUp(data)
      
      setUser(user)
      setToken(token)
      setIsClerkUser(false)
      apiClient.setToken(token)
      
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    clearAuthState()
  }

  const value: AuthContextType = {
    user,
    token,
    isClerkUser,
    signIn,
    signUp,
    signOut,
    clearAuthState,
    isLoading,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Step 7: Create Clerk User Sync API

Create `src/app/api/auth/sync-clerk-user/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const body = await request.json()
    const { clerkId, email, username, name, avatar } = body

    // Check if user exists by email
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    let user
    if (existingUser) {
      // Update existing user with Clerk ID
      user = await db.user.update({
        where: { id: existingUser.id },
        data: { 
          clerkId,
          username: username || existingUser.username,
          name: name || existingUser.name,
          avatar: avatar || existingUser.avatar,
          isVerified: true
        }
      })
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          clerkId,
          email: email.toLowerCase(),
          username: username || email.split('@')[0],
          name: name || email.split('@')[0],
          avatar,
          isVerified: true,
          isActive: true
        }
      })
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(createSuccessResponse({
      user: userWithoutPassword
    }, 'User synced successfully'))

  } catch (error: any) {
    console.error('Sync Clerk user error:', error)
    return NextResponse.json(createErrorResponse('Sync failed', error.message), { status: 500 })
  }
}
```

### Step 8: Update Protected API Routes

Example: Update `src/app/api/auth/me/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Try Clerk authentication first
    const { userId } = auth()
    if (userId) {
      const user = await getClerkApiUser()
      if (user) {
        return NextResponse.json({
          success: true,
          data: { user }
        })
      }
    }

    // Fallback to JWT authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'No token provided' 
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid token' 
      }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { user }
    })

  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

### Step 9: Update Frontend Components

Update sign-in/sign-up pages to use Clerk components:

Create `src/app/signin/page.tsx`:
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'bg-gray-900 border-gray-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white',
              formFieldLabel: 'text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300'
            }
          }}
        />
      </div>
    </div>
  )
}
```

Create `src/app/signup/page.tsx`:
```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'bg-gray-900 border-gray-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white',
              formFieldLabel: 'text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300'
            }
          }}
        />
      </div>
    </div>
  )
}
```

### Step 10: Test the Implementation

```bash
# Test the app
npm run dev

# Test authentication flows:
# 1. Sign up with Clerk
# 2. Sign in with Clerk
# 3. Test protected routes
# 4. Test user data sync
```

### Step 11: User Migration Script

Create `scripts/migrate-users-to-clerk.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
import { clerkClient } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

async function migrateUsers() {
  console.log('Starting user migration to Clerk...')
  
  const users = await prisma.user.findMany({
    where: { 
      clerkId: null,
      password: { not: null }
    }
  })
  
  console.log(`Found ${users.length} users to migrate`)
  
  for (const user of users) {
    try {
      console.log(`Migrating user: ${user.email}`)
      
      // Create Clerk user
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [user.email],
        username: user.username,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        skipPasswordChecks: true, // Skip password requirements
        skipPasswordRequirement: true
      })
      
      // Update database
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkId: clerkUser.id }
      })
      
      console.log(`✅ Migrated user: ${user.email} -> ${clerkUser.id}`)
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user.email}:`, error)
    }
  }
  
  console.log('User migration completed!')
}

migrateUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Step 12: Run Migration

```bash
# Run user migration
npx tsx scripts/migrate-users-to-clerk.ts
```

## Testing Checklist

- [ ] Clerk sign-up works
- [ ] Clerk sign-in works  
- [ ] User data syncs to database
- [ ] Protected API routes work with Clerk
- [ ] Legacy JWT auth still works (during transition)
- [ ] WebSocket authentication works
- [ ] User migration script works
- [ ] All existing functionality preserved

## Rollback Plan

If issues occur:

1. **Database Rollback**:
   ```bash
   cp prisma/dev.db.backup prisma/dev.db
   ```

2. **Code Rollback**:
   ```bash
   git checkout backup-before-clerk-migration
   ```

3. **Environment Rollback**:
   ```bash
   # Remove Clerk environment variables
   # Restore original .env.local
   ```

## Next Steps After Implementation

1. **Monitor for 24-48 hours**
2. **Migrate all users to Clerk**
3. **Remove legacy JWT authentication**
4. **Remove password field from database**
5. **Clean up unused code**

---

This implementation provides a smooth migration path with backward compatibility and rollback options.
