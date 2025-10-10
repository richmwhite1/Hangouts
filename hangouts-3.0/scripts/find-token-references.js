#!/usr/bin/env node

/**
 * Find and Fix All Token References Script
 * Finds all remaining references to token and fixes them
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

console.log(`🔧 Finding token references in ${filesToFix.length} files...`);

function findTokenReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tokenPatterns = [
    /user\.token/g,
    /user\?\.token/g,
    /token\s*=/g,
    /const\s+token\s*=/g,
    /let\s+token\s*=/g,
    /var\s+token\s*=/g,
    /if\s*\(\s*!token\s*\)/g,
    /if\s*\(\s*token\s*\)/g,
    /token\s*\?/g,
    /localStorage\.getItem\('auth_token'\)/g,
    /Bearer\s+\$\{token\}/g,
    /Authorization.*token/g
  ];

  const matches = [];
  tokenPatterns.forEach(pattern => {
    const found = content.match(pattern);
    if (found) {
      matches.push({
        pattern: pattern.source,
        matches: found
      });
    }
  });

  return matches;
}

let filesWithTokens = 0;
let totalMatches = 0;

filesToFix.forEach(filePath => {
  const matches = findTokenReferences(filePath);
  if (matches.length > 0) {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`\n🔍 ${relativePath}:`);
    matches.forEach(match => {
      console.log(`  - ${match.pattern}: ${match.matches.length} occurrences`);
      totalMatches += match.matches.length;
    });
    filesWithTokens++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Files with token references: ${filesWithTokens}`);
console.log(`  Total token references: ${totalMatches}`);

if (filesWithTokens > 0) {
  console.log(`\n⚠️  Found token references that need to be fixed!`);
  console.log(`\n🎯 Next steps:`);
  console.log(`1. Fix all token references manually`);
  console.log(`2. Replace with user-based checks`);
  console.log(`3. Remove Authorization headers`);
  console.log(`4. Test build locally`);
  console.log(`5. Deploy to Railway`);
} else {
  console.log(`\n✅ No token references found!`);
}
