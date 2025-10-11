// Development authentication helper
export function getDevUser() {
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')) {
    return {
      id: 'cmgmmbehc0000jpzattv53v2o', // Development user ID
      email: 'dev@example.com',
      username: 'devuser',
      name: 'Development User',
      avatar: null,
      isActive: true,
      isVerified: true,
      role: 'USER'
    }
  }
  return null
}

export function isDevelopmentMode() {
  return process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')
}
