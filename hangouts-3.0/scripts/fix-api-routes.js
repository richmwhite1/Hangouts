#!/usr/bin/env node

/**
 * Fix API Routes Script
 * Updates all API routes to use Clerk authentication instead of JWT
 */

const fs = require('fs');
const path = require('path');

// List of critical API routes that need to be updated
const routesToFix = [
  'src/app/api/notifications/preferences/route.ts',
  'src/app/api/conversations/unread-counts/route.ts',
  'src/app/api/feed-simple/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/events/route.ts',
  'src/app/api/hangouts/route.ts',
  'src/app/api/friends/route.ts',
  'src/app/api/friends/requests/route.ts',
  'src/app/api/friends/status/[userId]/route.ts',
  'src/app/api/profile/route.ts',
  'src/app/api/discover/route.ts',
  'src/app/api/feed/route.ts'
];

function updateRouteFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  // Replace JWT imports with Clerk imports
  if (content.includes("import { verifyToken } from '@/lib/auth'")) {
    content = content.replace(
      "import { verifyToken } from '@/lib/auth'",
      "import { auth } from '@clerk/nextjs/server'\nimport { getClerkApiUser } from '@/lib/clerk-auth'"
    );
    updated = true;
  }

  // Replace JWT authentication patterns
  const jwtPatterns = [
    // Pattern 1: Authorization header with Bearer token
    {
      from: /const authHeader = request\.headers\.get\('authorization'\)\s*if \(!authHeader \|\| !authHeader\.startsWith\('Bearer '\)\) \{\s*return NextResponse\.json\(\{ error: 'No token provided' \}, \{ status: 401 \}\)\s*\}\s*const token = authHeader\.substring\(7\)\s*const payload = verifyToken\(token\)\s*if \(!payload\) \{\s*return NextResponse\.json\(\{ error: 'Invalid token' \}, \{ status: 401 \}\)\s*\}/g,
      to: `// Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }`
    },
    
    // Pattern 2: Simple token verification
    {
      from: /const token = request\.headers\.get\('authorization'\)\?\.replace\('Bearer ', ''\)\s*if \(!token\) \{\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\}\s*const payload = verifyToken\(token\)\s*if \(!payload\) \{\s*return NextResponse\.json\(\{ error: 'Invalid token' \}, \{ status: 401 \}\)\s*\}/g,
      to: `// Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }`
    },

    // Pattern 3: Authorization header check
    {
      from: /const authHeader = request\.headers\.get\('authorization'\)\s*if \(!authHeader\?\.startsWith\('Bearer '\)\) \{\s*return NextResponse\.json\(\s*\{ success: false, error: 'Authorization header required' \},\s*\{ status: 401 \}\s*\)\s*\}\s*const token = authHeader\.substring\(7\)\s*const user = await verifyToken\(token\)\s*if \(!user\) \{\s*return NextResponse\.json\(\s*\{ success: false, error: 'Invalid token' \},\s*\{ status: 401 \}\s*\)\s*\}/g,
      to: `// Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
    }`
    }
  ];

  // Apply pattern replacements
  jwtPatterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      updated = true;
    }
  });

  // Replace payload.userId with user.id
  if (content.includes('payload.userId')) {
    content = content.replace(/payload\.userId/g, 'user.id');
    updated = true;
  }

  // Replace payload with user in other contexts
  if (content.includes('payload.email')) {
    content = content.replace(/payload\.email/g, 'user.email');
    updated = true;
  }

  if (content.includes('payload.username')) {
    content = content.replace(/payload\.username/g, 'user.username');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️ No changes needed: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing API routes to use Clerk authentication...\n');
  
  let fixedCount = 0;
  
  routesToFix.forEach(route => {
    if (updateRouteFile(route)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedCount} out of ${routesToFix.length} routes`);
  console.log('\n🎯 Next steps:');
  console.log('1. Test the fixed routes locally');
  console.log('2. Build and deploy to Railway');
  console.log('3. Test in production');
}

main();
