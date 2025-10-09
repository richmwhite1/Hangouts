# 🔐 Clerk Authentication Migration Plan

## Overview
This document outlines a comprehensive plan to migrate from the current custom JWT authentication system to Clerk authentication while maintaining app functionality and preventing breaking changes.

## Current Authentication System Analysis

### Components to Replace:
1. **Custom JWT System** (`src/lib/auth.ts`, `src/lib/auth-enhanced.ts`)
2. **Auth Context** (`src/contexts/auth-context.tsx`)
3. **API Authentication** (`src/lib/api-middleware.ts`, `src/lib/api-handler.ts`)
4. **Auth Routes** (`src/app/api/auth/signin`, `src/app/api/auth/signup`, `src/app/api/auth/me`)
5. **Database User Model** (password field, custom auth fields)
6. **WebSocket Authentication** (`src/contexts/websocket-context.tsx`)

### Database Schema Changes Needed:
- Remove `password` field from User model
- Add `clerkId` field to User model
- Update user creation/verification logic
- Migrate existing users to Clerk

## Migration Strategy: Phased Approach

### Phase 1: Setup Clerk (Non-Breaking)
1. **Install Clerk Dependencies**
   ```bash
   npm install @clerk/nextjs
   ```

2. **Environment Setup**
   - Add Clerk keys to `.env.local`
   - Configure Clerk dashboard

3. **Database Schema Update**
   ```prisma
   model User {
     id        String   @id @default(cuid())
     clerkId   String   @unique  // New field
     email     String   @unique
     username  String   @unique
     name      String
     // ... other fields
     password  String?  // Make optional for migration
     // ... rest of schema
   }
   ```

4. **Create Migration Script**
   - Add `clerkId` field
   - Keep `password` field optional during transition

### Phase 2: Dual Authentication (Backward Compatible)
1. **Update Auth Context to Support Both Systems**
   ```typescript
   // src/contexts/auth-context.tsx
   interface AuthContextType {
     user: User | null
     token: string | null
     isClerkUser: boolean  // New flag
     signIn: (data: SignInData) => Promise<void>
     signUp: (data: SignUpData) => Promise<void>
     signOut: () => void
     isLoading: boolean
     isAuthenticated: boolean
   }
   ```

2. **Create Clerk Auth Wrapper**
   ```typescript
   // src/lib/clerk-auth.ts
   export function getClerkUser() {
     // Clerk user data extraction
   }
   
   export function getClerkToken() {
     // Clerk token extraction
   }
   ```

3. **Update API Middleware for Dual Support**
   ```typescript
   // src/lib/api-middleware.ts
   export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
     return async (req: NextRequest): Promise<NextResponse> => {
       // Try Clerk authentication first
       const clerkAuth = await getClerkAuth(req)
       if (clerkAuth.success) {
         req.user = clerkAuth.user
         return await handler(req)
       }
       
       // Fallback to JWT authentication
       const jwtAuth = await getJWTAuth(req)
       if (jwtAuth.success) {
         req.user = jwtAuth.user
         return await handler(req)
       }
       
       return unauthorized()
     }
   }
   ```

### Phase 3: User Migration
1. **Create User Migration Script**
   ```typescript
   // scripts/migrate-users-to-clerk.ts
   async function migrateUsers() {
     const users = await db.user.findMany({
       where: { clerkId: null }
     })
     
     for (const user of users) {
       // Create Clerk user
       const clerkUser = await clerkClient.users.createUser({
         emailAddress: [user.email],
         username: user.username,
         firstName: user.name.split(' ')[0],
         lastName: user.name.split(' ')[1] || '',
       })
       
       // Update database
       await db.user.update({
         where: { id: user.id },
         data: { clerkId: clerkUser.id }
       })
     }
   }
   ```

2. **Create Clerk User Sync Webhook**
   ```typescript
   // src/app/api/webhooks/clerk/route.ts
   export async function POST(req: NextRequest) {
     const { type, data } = await req.json()
     
     switch (type) {
       case 'user.created':
         await syncUserToDatabase(data)
         break
       case 'user.updated':
         await updateUserInDatabase(data)
         break
       case 'user.deleted':
         await deleteUserFromDatabase(data)
         break
     }
   }
   ```

### Phase 4: Frontend Integration
1. **Update Layout with ClerkProvider**
   ```typescript
   // src/app/layout.tsx
   import { ClerkProvider } from '@clerk/nextjs'
   
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <ClerkProvider>
         <AuthProvider>
           {children}
         </AuthProvider>
       </ClerkProvider>
     )
   }
   ```

2. **Create Clerk-Aware Auth Context**
   ```typescript
   // src/contexts/auth-context.tsx
   export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
     const { isSignedIn, user: clerkUser, getToken } = useAuth()
     const [legacyUser, setLegacyUser] = useState<User | null>(null)
     const [isLoading, setIsLoading] = useState(true)
     
     useEffect(() => {
       if (isSignedIn && clerkUser) {
         // Sync Clerk user with database
         syncClerkUser(clerkUser)
       } else {
         // Check for legacy JWT authentication
         checkLegacyAuth()
       }
     }, [isSignedIn, clerkUser])
     
     // ... rest of implementation
   }
   ```

3. **Update Components to Use Clerk**
   ```typescript
   // Replace custom auth components
   import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
   
   // Update navigation and auth flows
   ```

### Phase 5: API Route Updates
1. **Create Clerk Auth Helper**
   ```typescript
   // src/lib/clerk-api-auth.ts
   import { auth } from '@clerk/nextjs/server'
   
   export async function getClerkApiUser() {
     const { userId } = auth()
     if (!userId) return null
     
     const user = await db.user.findUnique({
       where: { clerkId: userId },
       select: { id: true, email: true, username: true, name: true, role: true }
     })
     
     return user
   }
   ```

2. **Update Protected API Routes**
   ```typescript
   // src/app/api/protected-route/route.ts
   export async function GET() {
     const user = await getClerkApiUser()
     if (!user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     
     // Use user data
   }
   ```

### Phase 6: WebSocket Integration
1. **Update WebSocket Authentication**
   ```typescript
   // src/contexts/websocket-context.tsx
   export function WebSocketProvider({ children }: { children: React.ReactNode }) {
     const { getToken } = useAuth()
     
     useEffect(() => {
       if (isSignedIn) {
         getToken().then(token => {
           if (token) {
             const socket = io(WS_URL, {
               auth: { token },
               transports: ['polling', 'websocket']
             })
             // ... socket setup
           }
         })
       }
     }, [isSignedIn, getToken])
   }
   ```

### Phase 7: Cleanup
1. **Remove Legacy Authentication**
   - Delete JWT auth files
   - Remove password field from User model
   - Remove custom auth routes
   - Update all components to use Clerk

2. **Database Cleanup**
   ```sql
   ALTER TABLE User DROP COLUMN password;
   ```

## Implementation Steps

### Step 1: Install and Configure Clerk
```bash
# Install Clerk
npm install @clerk/nextjs

# Add to .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Step 2: Database Migration
```bash
# Create migration
npx prisma migrate dev --name add-clerk-id

# Update schema
# Add clerkId field to User model
```

### Step 3: Create Clerk Integration Files
- `src/lib/clerk-auth.ts` - Clerk authentication helpers
- `src/lib/clerk-api-auth.ts` - API authentication with Clerk
- `src/app/api/webhooks/clerk/route.ts` - Clerk webhooks

### Step 4: Update Auth Context
- Modify `src/contexts/auth-context.tsx` to support both systems
- Add Clerk user sync functionality

### Step 5: Update API Routes
- Modify protected routes to use Clerk authentication
- Maintain backward compatibility during transition

### Step 6: Update Frontend Components
- Replace custom auth components with Clerk components
- Update navigation and user flows

### Step 7: Test and Validate
- Test both authentication systems work
- Validate user data sync
- Test all protected routes

### Step 8: Migrate Users
- Run user migration script
- Verify all users have Clerk IDs

### Step 9: Remove Legacy Code
- Remove JWT authentication code
- Remove password field from database
- Clean up unused files

## Risk Mitigation

### Backup Strategy
1. **Database Backup**
   ```bash
   # Backup before migration
   cp prisma/dev.db prisma/dev.db.backup
   ```

2. **Code Backup**
   ```bash
   # Create backup branch
   git checkout -b backup-before-clerk-migration
   git add .
   git commit -m "Backup before Clerk migration"
   ```

### Rollback Plan
1. **Database Rollback**
   - Restore from backup
   - Run reverse migration

2. **Code Rollback**
   - Switch to backup branch
   - Restore environment variables

### Testing Strategy
1. **Unit Tests**
   - Test authentication flows
   - Test API route protection
   - Test user data sync

2. **Integration Tests**
   - Test end-to-end authentication
   - Test WebSocket connections
   - Test user migration

3. **User Acceptance Testing**
   - Test sign-in/sign-up flows
   - Test protected features
   - Test user profile management

## Timeline Estimate

- **Phase 1-2**: 2-3 days (Setup and dual auth)
- **Phase 3**: 1-2 days (User migration)
- **Phase 4**: 2-3 days (Frontend integration)
- **Phase 5**: 1-2 days (API updates)
- **Phase 6**: 1 day (WebSocket integration)
- **Phase 7**: 1-2 days (Cleanup and testing)

**Total Estimated Time**: 8-13 days

## Success Criteria

1. ✅ All existing users can authenticate
2. ✅ New users can sign up via Clerk
3. ✅ All protected routes work correctly
4. ✅ WebSocket authentication works
5. ✅ User data syncs properly
6. ✅ No breaking changes to existing functionality
7. ✅ Performance is maintained or improved
8. ✅ Security is enhanced

## Next Steps

1. **Review and approve this plan**
2. **Set up Clerk account and get API keys**
3. **Create backup of current system**
4. **Begin Phase 1 implementation**
5. **Test each phase thoroughly before proceeding**

---

This migration plan ensures a smooth transition to Clerk while maintaining app functionality and providing rollback options if needed.
