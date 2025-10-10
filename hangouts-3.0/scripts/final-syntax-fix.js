#!/usr/bin/env node

/**
 * Final Syntax Fix Script
 * Fixes all remaining syntax errors with comprehensive patterns
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

console.log(`🔧 Final syntax fix for ${filesToFix.length} files...`);

function fixAllRemainingErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Comprehensive patterns to fix all remaining syntax errors
  const patterns = [
    // Pattern 1: fetch(url, {, )
    {
      from: /fetch\(([^)]*)\{\s*,\s*\)/g,
      to: 'fetch($1)'
    },
    
    // Pattern 2: fetch(url, { method: 'POST', )
    {
      from: /fetch\(([^)]*)\{\s*method:\s*['"][^'"]*['"]\s*,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        return `fetch(${url}, { method: '${method}' })`;
      }
    },
    
    // Pattern 3: fetch(url, { headers: { }, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*\}\s*,\s*\)/g,
      to: 'fetch($1)'
    },
    
    // Pattern 4: fetch(url, { headers: { }, method: 'POST', )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*\}\s*,\s*method:\s*['"][^'"]*['"]\s*,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        return `fetch(${url}, { method: '${method}' })`;
      }
    },
    
    // Pattern 5: fetch(url, { headers: { }, body: data, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*\}\s*,\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { body: ${body} })`;
      }
    },
    
    // Pattern 6: fetch(url, { headers: { }, method: 'POST', body: data, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*\}\s*,\s*method:\s*['"][^'"]*['"]\s*,\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { method: '${method}', body: ${body} })`;
      }
    },
    
    // Pattern 7: fetch(url, { body: data, )
    {
      from: /fetch\(([^)]*)\{\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { body: ${body} })`;
      }
    },
    
    // Pattern 8: fetch(url, { method: 'POST', body: data, )
    {
      from: /fetch\(([^)]*)\{\s*method:\s*['"][^'"]*['"]\s*,\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { method: '${method}', body: ${body} })`;
      }
    },
    
    // Pattern 9: fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{[^}]+\}`\s*\}\s*,\s*\)/g,
      to: 'fetch($1)'
    },
    
    // Pattern 10: fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, method: 'POST', )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{[^}]+\}`\s*\}\s*,\s*method:\s*['"][^'"]*['"]\s*,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        return `fetch(${url}, { method: '${method}' })`;
      }
    },
    
    // Pattern 11: fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, body: data, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{[^}]+\}`\s*\}\s*,\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { body: ${body} })`;
      }
    },
    
    // Pattern 12: fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, method: 'POST', body: data, )
    {
      from: /fetch\(([^)]*)\{\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{[^}]+\}`\s*\}\s*,\s*method:\s*['"][^'"]*['"]\s*,\s*body:\s*[^,]+,\s*\)/g,
      to: (match) => {
        const url = match.match(/fetch\(([^,]+),/)[1];
        const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
        const body = match.match(/body:\s*([^,]+),/)[1];
        return `fetch(${url}, { method: '${method}', body: ${body} })`;
      }
    }
  ];

  // Apply pattern replacements
  patterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      updated = true;
    }
  });

  // Additional cleanup patterns
  const cleanupPatterns = [
    // Remove empty headers objects
    { from: /headers:\s*\{\s*\}/g, to: '' },
    // Remove trailing commas before closing braces
    { from: /,\s*\}/g, to: '}' },
    { from: /,\s*\)/g, to: ')' },
    // Fix double commas
    { from: /,\s*,/g, to: ',' },
    // Fix empty objects in fetch calls
    { from: /fetch\(([^)]*)\{\s*\}/g, to: 'fetch($1)' },
    // Fix malformed method calls
    { from: /method:\s*['"][^'"]*['"]\s*\)/g, to: (match) => {
      const method = match.match(/method:\s*['"]([^'"]*)['"]/)[1];
      return `method: '${method}' })`;
    }},
    // Fix malformed body calls
    { from: /body:\s*[^,]+,\s*\)/g, to: (match) => {
      const body = match.match(/body:\s*([^,]+),/)[1];
      return `body: ${body} })`;
    }}
  ];

  cleanupPatterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      updated = true;
    }
  });

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
    if (fixAllRemainingErrors(filePath)) {
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
