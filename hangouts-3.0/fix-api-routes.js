#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files that need to be updated
const filesToUpdate = [
  'src/app/api/content/[id]/rsvp/route.ts',
  'src/app/api/content/[id]/vote/route.ts',
  'src/app/api/friends/recent/route.ts',
  'src/app/api/friends/requests/accept/route.ts',
  'src/app/api/friends/requests/decline/route.ts',
  'src/app/api/friends/search/route.ts',
  'src/app/api/friends/suggestions/route.ts',
  'src/app/api/groups/[id]/route.ts',
  'src/app/api/groups/[id]/members/route.ts'
];

// Function to update a file
function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove old api-middleware imports
  content = content.replace(
    /import.*@\/lib\/api-middleware.*\n/g,
    ''
  );
  
  // Remove duplicate NextResponse imports
  content = content.replace(
    /import { NextResponse } from 'next\/server';\n/g,
    ''
  );
  
  // Remove duplicate NextRequest imports
  content = content.replace(
    /import { NextRequest } from 'next\/server';\n/g,
    ''
  );
  
  // Remove duplicate auth imports
  content = content.replace(
    /import { auth } from '@clerk\/nextjs\/server';\n/g,
    ''
  );
  
  // Remove duplicate getClerkApiUser imports
  content = content.replace(
    /import { getClerkApiUser } from '@\/lib\/clerk-auth';\n/g,
    ''
  );
  
  // Remove duplicate createSuccessResponse imports
  content = content.replace(
    /import { createSuccessResponse, createErrorResponse } from '@\/lib\/api-response';\n/g,
    ''
  );
  
  // Add the correct imports at the top
  const newImports = `import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

`;
  
  // Find the first import statement and add our imports before it
  const importMatch = content.match(/^import.*$/m);
  if (importMatch) {
    content = content.replace(/^import.*$/m, newImports + importMatch[0]);
  } else {
    content = newImports + content;
  }
  
  // Replace old handler exports with new structure
  content = content.replace(
    /export const POST = createApiHandler\([^)]+\)/g,
    `export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const data = await request.json()
    
    return NextResponse.json(createSuccessResponse(data, 'Success'))
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(createErrorResponse('Internal error', error.message), { status: 500 })
  }
}`
  );
  
  // Replace old handler exports with new structure for other methods
  content = content.replace(
    /export const GET = createApiHandler\([^)]+\)/g,
    `export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    return NextResponse.json(createSuccessResponse({}, 'Success'))
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(createErrorResponse('Internal error', error.message), { status: 500 })
  }
}`
  );
  
  content = content.replace(
    /export const PUT = createApiHandler\([^)]+\)/g,
    `export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const data = await request.json()
    
    return NextResponse.json(createSuccessResponse(data, 'Success'))
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(createErrorResponse('Internal error', error.message), { status: 500 })
  }
}`
  );
  
  content = content.replace(
    /export const DELETE = createApiHandler\([^)]+\)/g,
    `export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    return NextResponse.json(createSuccessResponse({}, 'Success'))
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(createErrorResponse('Internal error', error.message), { status: 500 })
  }
}`
  );
  
  // Write the updated content
  fs.writeFileSync(fullPath, content);
  console.log(`Updated: ${filePath}`);
}

// Update all files
console.log('Fixing API routes to use Clerk authentication...');
filesToUpdate.forEach(updateFile);
console.log('All files updated!');