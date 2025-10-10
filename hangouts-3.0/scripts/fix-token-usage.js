#!/usr/bin/env node

/**
 * Fix Token Usage Script
 * Removes all token usage from components since Clerk handles auth automatically
 */

const fs = require('fs');
const path = require('path');

// Get all files that use token from useAuth
const srcDir = path.join(__dirname, '..', 'src');
const filesToFix = [];

function findFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('const') && content.includes('token') && content.includes('useAuth')) {
        filesToFix.push(filePath);
      }
    }
  }
}

findFiles(srcDir);

console.log(`🔧 Found ${filesToFix.length} files to fix...`);

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Remove token from useAuth destructuring
  if (content.includes('const { user, token } = useAuth()')) {
    content = content.replace('const { user, token } = useAuth()', 'const { user } = useAuth()');
    updated = true;
  }

  if (content.includes('const { user, token, isAuthenticated } = useAuth()')) {
    content = content.replace('const { user, token, isAuthenticated } = useAuth()', 'const { user, isAuthenticated } = useAuth()');
    updated = true;
  }

  if (content.includes('const { user, token, isAuthenticated, isLoading } = useAuth()')) {
    content = content.replace('const { user, token, isAuthenticated, isLoading } = useAuth()', 'const { user, isAuthenticated, isLoading } = useAuth()');
    updated = true;
  }

  if (content.includes('const { user, token, isAuthenticated, isLoading, signOut } = useAuth()')) {
    content = content.replace('const { user, token, isAuthenticated, isLoading, signOut } = useAuth()', 'const { user, isAuthenticated, isLoading, signOut } = useAuth()');
    updated = true;
  }

  // Remove token checks
  if (content.includes('if (!token)')) {
    content = content.replace(/if \(!token\)\s*\{[^}]*\}/g, '');
    updated = true;
  }

  if (content.includes('if (!token || !user)')) {
    content = content.replace(/if \(!token \|\| !user\)\s*\{[^}]*\}/g, 'if (!user) {');
    updated = true;
  }

  // Remove Authorization headers from fetch calls
  content = content.replace(/headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`[^}]*\}/g, 'headers: {');
  content = content.replace(/headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"],\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`[^}]*\}/g, 'headers: { \'Content-Type\': \'application/json\' }');
  
  // Clean up empty headers objects
  content = content.replace(/headers:\s*\{\s*\}/g, '');
  content = content.replace(/headers:\s*\{\s*,\s*\}/g, 'headers: {}');
  
  updated = true;

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
console.log('1. Test image uploads work without token');
console.log('2. Create realistic users and content');
console.log('3. Deploy and test complete functionality');
