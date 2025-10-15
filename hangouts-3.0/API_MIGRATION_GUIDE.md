# API Migration Guide - Phase 1.1

## 🚀 **New API Handler System**

This guide documents the new standardized API handler system that provides consistent error handling, validation, authentication, and logging across all endpoints.

## 📋 **Key Features**

### ✅ **Consistent Response Format**
```typescript
// Success Response
{
  "success": true,
  "data": T,
  "message": "Optional success message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_1234567890_abc123"
}

// Error Response
{
  "success": false,
  "error": "Error type",
  "message": "Human readable message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_1234567890_abc123"
}
```

### ✅ **Built-in Middleware**
- **Authentication**: JWT token verification
- **Authorization**: RBAC permission checking (coming in Phase 1.2)
- **Rate Limiting**: Configurable per endpoint
- **Input Validation**: Zod schema validation
- **Error Handling**: Consistent error responses
- **CORS**: Configurable CORS headers
- **Logging**: Request/response logging
- **API Versioning**: Support for multiple API versions

## 🔧 **Usage Examples**

### **Basic Authenticated Endpoint**
```typescript
import { createApiHandler, createSuccessResponse, API_CONFIGS } from '@/lib/api-handler'

async function getDataHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId
  
  // Your business logic here
  const data = await getData(userId)
  
  return createSuccessResponse(data, 'Data retrieved successfully')
}

export const GET = createApiHandler(
  getDataHandler,
  {
    ...API_CONFIGS.AUTHENTICATED,
    version: 'v1'
  }
)
```

### **Public Endpoint with Validation**
```typescript
import { createApiHandler, createSuccessResponse, API_CONFIGS } from '@/lib/api-handler'
import { commonSchemas } from '@/lib/validation-schemas'

async function createDataHandler(request: NextRequest, validatedData: any) {
  const { name, email } = validatedData
  
  // Your business logic here
  const data = await createData({ name, email })
  
  return createSuccessResponse(data, 'Data created successfully')
}

export const POST = createApiHandler(
  createDataHandler,
  {
    ...API_CONFIGS.PUBLIC,
    validateInput: commonSchemas.user.create,
    version: 'v1'
  }
)
```

### **Admin Endpoint**
```typescript
import { createApiHandler, createSuccessResponse, API_CONFIGS } from '@/lib/api-handler'

async function adminHandler(request: AuthenticatedRequest) {
  // Admin logic here
  const data = await getAdminData()
  
  return createSuccessResponse(data, 'Admin data retrieved')
}

export const GET = createApiHandler(
  adminHandler,
  {
    ...API_CONFIGS.ADMIN,
    version: 'v1'
  }
)
```

## 📊 **API Configurations**

### **Available Configurations**
```typescript
// Public endpoints (no auth required)
API_CONFIGS.PUBLIC = {
  enableCORS: true,
  enableLogging: true,
  rateLimit: { limit: 100, windowMs: 60000 }
}

// Authenticated endpoints
API_CONFIGS.AUTHENTICATED = {
  requireAuth: true,
  enableCORS: true,
  enableLogging: true,
  rateLimit: { limit: 200, windowMs: 60000 }
}

// Admin endpoints
API_CONFIGS.ADMIN = {
  requireAuth: true,
  requiredPermissions: ['admin:access'],
  enableCORS: true,
  enableLogging: true,
  rateLimit: { limit: 50, windowMs: 60000 }
}

// Upload endpoints
API_CONFIGS.UPLOAD = {
  requireAuth: true,
  enableCORS: true,
  enableLogging: true,
  rateLimit: { limit: 10, windowMs: 60000 }
}
```

## 🔍 **Validation Schemas**

### **Available Schemas**
```typescript
import { commonSchemas } from '@/lib/validation-schemas'

// Authentication
commonSchemas.auth.signUp
commonSchemas.auth.signIn
commonSchemas.auth.changePassword

// User management
commonSchemas.user.id
commonSchemas.user.email
commonSchemas.user.username
commonSchemas.user.name

// Hangouts
commonSchemas.hangout.create
commonSchemas.hangout.update
commonSchemas.hangout.rsvp

// Friends
commonSchemas.friend.request
commonSchemas.friend.respond
commonSchemas.friend.search

// Groups
commonSchemas.group.create
commonSchemas.group.update
commonSchemas.group.invite

// Polls
commonSchemas.poll.create
commonSchemas.poll.vote

// Notifications
commonSchemas.notification.preferences
commonSchemas.notification.markRead

// Comments
commonSchemas.comment.create
commonSchemas.comment.update

// Uploads
commonSchemas.upload.image

// User preferences
commonSchemas.preferences.update
```

## 🚨 **Error Codes**

### **Standard Error Codes**
- `MISSING_TOKEN` - No authorization token provided
- `INVALID_TOKEN` - Token is invalid or expired
- `USER_NOT_FOUND` - User account not found
- `ACCOUNT_DEACTIVATED` - User account is deactivated
- `INVALID_CREDENTIALS` - Invalid email or password
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `CORS_ERROR` - Origin not allowed
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Unexpected server error

## 📈 **Migration Status**

### ✅ **Completed**
- [x] New API handler system (`src/lib/api-handler.ts`)
- [x] Comprehensive validation schemas (`src/lib/validation-schemas.ts`)
- [x] Updated auth endpoints:
  - [x] `POST /api/auth/signin`
  - [x] `POST /api/auth/signup`
  - [x] `GET /api/auth/me`
- [x] Updated friends endpoint:
  - [x] `GET /api/friends`

### 🔄 **In Progress**
- [ ] Update remaining API endpoints
- [ ] Add RBAC permission checking
- [ ] Implement comprehensive logging
- [ ] Add API versioning support

### 📋 **Pending**
- [ ] Update hangout endpoints
- [ ] Update group endpoints
- [ ] Update notification endpoints
- [ ] Update upload endpoints
- [ ] Add comprehensive error monitoring
- [ ] Add API documentation generation

## 🎯 **Next Steps**

1. **Phase 1.2**: Implement RBAC system
2. **Phase 1.3**: Create data access layer services
3. **Phase 2**: Frontend architecture cleanup
4. **Phase 3**: Data privacy and access control
5. **Phase 4**: Real-time and notifications
6. **Phase 5**: Testing and monitoring

## 🔧 **Development Guidelines**

### **Creating New Endpoints**
1. Use `createApiHandler` from `@/lib/api-handler`
2. Choose appropriate `API_CONFIGS` configuration
3. Add input validation using `commonSchemas`
4. Use `createSuccessResponse` and `createErrorResponse`
5. Include proper error handling and logging
6. Add API versioning support

### **Updating Existing Endpoints**
1. Replace manual auth checking with `createApiHandler`
2. Replace manual validation with schema validation
3. Replace custom error responses with standardized responses
4. Add proper logging and monitoring
5. Test thoroughly before deployment

This new system provides a solid foundation for building scalable, maintainable APIs with consistent behavior across all endpoints.


























