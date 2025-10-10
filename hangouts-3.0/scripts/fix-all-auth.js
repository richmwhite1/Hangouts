#!/usr/bin/env node

/**
 * Fix All Authentication Script
 * Updates ALL remaining API routes to use Clerk authentication instead of JWT
 */

const fs = require('fs');
const path = require('path');

// Get all API route files that still use JWT
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const filesToFix = [];

function findFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath);
    } else if (file === 'route.ts' || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('verifyToken') && content.includes('@/lib/auth')) {
        filesToFix.push(filePath);
      }
    }
  }
}

findFiles(apiDir);

console.log(`🔧 Found ${filesToFix.length} files to fix...`);

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
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
      from: /const authHeader = request\.headers\.get\('authorization'\)\s*if \(!authHeader\?\.startsWith\('Bearer '\)\) \{\s*return NextResponse\.json\(\s*\{ success: false, error: 'Authorization header required' \},\s*\{ status: 401 \}\s*\)\s*\}\s*const token = authHeader\.substring\(7\)\s*const user = await verifyToken\(token\)\s*if \(!user\) \{\s*return NextResponse.json\(\s*\{ success: false, error: 'Invalid token' \},\s*\{ status: 401 \}\s*\)\s*\}/g,
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
    },

    // Pattern 4: Simple token check
    {
      from: /const token = request\.headers\.get\('authorization'\)\?\.replace\('Bearer ', ''\)\s*if \(!token\) \{\s*return NextResponse\.json\(\{ success: false, error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\}\s*const payload = verifyToken\(token\)\s*if \(!payload\) \{\s*return NextResponse\.json\(\{ success: false, error: 'Invalid token' \}, \{ status: 401 \}\)\s*\}/g,
      to: `// Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 })
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
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

let fixedCount = 0;
let errorCount = 0;

filesToFix.forEach(filePath => {
  try {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    if (updateFile(filePath)) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixedCount++;
    } else {
      console.log(`ℹ️ No changes needed: ${relativePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${filesToFix.length} files`);
if (errorCount > 0) {
  console.log(`❌ ${errorCount} files had errors`);
}
console.log('\n🎯 Next steps:');
console.log('1. Test the fixed routes locally');
console.log('2. Build and deploy to Railway');
console.log('3. Test complete app functionality');
