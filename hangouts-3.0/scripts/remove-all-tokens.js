#!/usr/bin/env node

/**
 * Comprehensive Token Removal Script
 * Automatically removes all token references and replaces with Clerk auth
 */

const fs = require('fs');
const path = require('path');

// Get all TypeScript/JavaScript files
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
      filesToFix.push(filePath);
    }
  }
}

findFiles(srcDir);

console.log(`🔧 Removing token references from ${filesToFix.length} files...`);

function removeAllTokenReferences(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Remove token variable declarations
  const patterns = [
    // Remove const token = localStorage.getItem('auth_token')
    {
      from: /const\s+token\s*=\s*localStorage\.getItem\('auth_token'\)\s*;?\s*/g,
      to: ''
    },
    
    // Remove let token = localStorage.getItem('auth_token')
    {
      from: /let\s+token\s*=\s*localStorage\.getItem\('auth_token'\)\s*;?\s*/g,
      to: ''
    },
    
    // Remove var token = localStorage.getItem('auth_token')
    {
      from: /var\s+token\s*=\s*localStorage\.getItem\('auth_token'\)\s*;?\s*/g,
      to: ''
    },
    
    // Remove token = localStorage.getItem('auth_token')
    {
      from: /token\s*=\s*localStorage\.getItem\('auth_token'\)\s*;?\s*/g,
      to: ''
    },
    
    // Remove if (!token) return statements
    {
      from: /if\s*\(\s*!\s*token\s*\)\s*return\s*;?\s*/g,
      to: ''
    },
    
    // Remove if (token) conditions
    {
      from: /if\s*\(\s*token\s*\)\s*\{/g,
      to: '{'
    },
    
    // Remove user?.token references
    {
      from: /user\?\.token/g,
      to: 'user'
    },
    
    // Remove user.token references
    {
      from: /user\.token/g,
      to: 'user'
    },
    
    // Remove Authorization headers with token
    {
      from: /headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*,?\s*\}/g,
      to: ''
    },
    
    // Remove Authorization headers with user.token
    {
      from: /headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{user\.token\}`\s*,?\s*\}/g,
      to: ''
    },
    
    // Remove Authorization headers with user?.token
    {
      from: /headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{user\?\.token\}`\s*,?\s*\}/g,
      to: ''
    },
    
    // Remove Bearer token from headers
    {
      from: /['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*,?\s*/g,
      to: ''
    },
    
    // Remove Bearer user.token from headers
    {
      from: /['"]Authorization['"]:\s*`Bearer \$\{user\.token\}`\s*,?\s*/g,
      to: ''
    },
    
    // Remove Bearer user?.token from headers
    {
      from: /['"]Authorization['"]:\s*`Bearer \$\{user\?\.token\}`\s*,?\s*/g,
      to: ''
    },
    
    // Remove token from function parameters
    {
      from: /,\s*token\s*\)/g,
      to: ')'
    },
    
    // Remove token from function calls
    {
      from: /\(\s*token\s*,/g,
      to: '('
    },
    
    // Remove token from useEffect dependencies
    {
      from: /,\s*token\s*\]/g,
      to: ']'
    },
    
    // Remove token from useEffect dependencies
    {
      from: /\[\s*token\s*,/g,
      to: '['
    },
    
    // Remove token from useEffect dependencies
    {
      from: /\[\s*token\s*\]/g,
      to: '[]'
    },
    
    // Remove token from conditional checks
    {
      from: /if\s*\(\s*token\s*\)/g,
      to: 'if (true)'
    },
    
    // Remove token from conditional checks
    {
      from: /if\s*\(\s*!\s*token\s*\)/g,
      to: 'if (false)'
    },
    
    // Remove token from ternary operators
    {
      from: /token\s*\?/g,
      to: 'true ?'
    },
    
    // Remove token from ternary operators
    {
      from: /!\s*token\s*\?/g,
      to: 'false ?'
    },
    
    // Remove token from logical operators
    {
      from: /&&\s*token/g,
      to: ''
    },
    
    // Remove token from logical operators
    {
      from: /\|\|\s*token/g,
      to: ''
    },
    
    // Remove token from logical operators
    {
      from: /token\s*&&/g,
      to: ''
    },
    
    // Remove token from logical operators
    {
      from: /token\s*\|\|/g,
      to: ''
    }
  ];

  // Apply pattern replacements
  patterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      updated = true;
    }
  });

  // Clean up empty lines and extra spaces
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  content = content.replace(/\s+$/gm, '');
  
  // Clean up empty objects in fetch calls
  content = content.replace(/fetch\(([^)]*)\{\s*\}/g, 'fetch($1)');
  
  // Clean up empty headers objects
  content = content.replace(/headers:\s*\{\s*\}/g, '');
  
  // Clean up trailing commas
  content = content.replace(/,\s*\}/g, '}');
  content = content.replace(/,\s*\)/g, ')');
  
  // Clean up double commas
  content = content.replace(/,\s*,/g, ',');

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
    if (removeAllTokenReferences(filePath)) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixedCount++;
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
console.log('1. Test build locally');
console.log('2. Deploy to Railway');
console.log('3. Test complete functionality');
