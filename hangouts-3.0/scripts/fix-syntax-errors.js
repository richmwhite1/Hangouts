#!/usr/bin/env node

/**
 * Fix Syntax Errors Script
 * Fixes all remaining syntax errors from the token removal script
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

console.log(`🔧 Checking ${filesToFix.length} files for syntax errors...`);

function fixSyntaxErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Fix malformed headers objects
  const patterns = [
    // Pattern 1: headers: {,
    {
      from: /headers:\s*\{\s*,/g,
      to: ''
    },
    
    // Pattern 2: headers: {, }
    {
      from: /headers:\s*\{\s*,\s*\}/g,
      to: ''
    },
    
    // Pattern 3: headers: {, body:
    {
      from: /headers:\s*\{\s*,\s*body:/g,
      to: 'body:'
    },
    
    // Pattern 4: headers: {, method:
    {
      from: /headers:\s*\{\s*,\s*method:/g,
      to: 'method:'
    },
    
    // Pattern 5: }, {, )
    {
      from: /\},\s*\{\s*,/g,
      to: '}, {'
    },
    
    // Pattern 6: }, {, )
    {
      from: /\},\s*\{\s*,\s*\)/g,
      to: '})'
    },
    
    // Pattern 7: {, )
    {
      from: /\{\s*,\s*\)/g,
      to: ')'
    },
    
    // Pattern 8: {, }
    {
      from: /\{\s*,\s*\}/g,
      to: '{}'
    },
    
    // Pattern 9: {, body:
    {
      from: /\{\s*,\s*body:/g,
      to: '{ body:'
    },
    
    // Pattern 10: {, method:
    {
      from: /\{\s*,\s*method:/g,
      to: '{ method:'
    }
  ];

  // Apply pattern replacements
  patterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      updated = true;
    }
  });

  // Clean up empty objects in fetch calls
  content = content.replace(/fetch\([^)]*\{\s*\}\s*\)/g, (match) => {
    const cleaned = match.replace(/\{\s*\}\s*/g, '');
    if (cleaned !== match) {
      updated = true;
      return cleaned;
    }
    return match;
  });

  // Clean up trailing commas before closing braces
  content = content.replace(/,\s*\}/g, '}');
  content = content.replace(/,\s*\)/g, ')');

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
    if (fixSyntaxErrors(filePath)) {
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
