#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Files to exclude from console.log removal
const excludeFiles = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'scripts',
  'prisma/migrations',
  '.git'
]

// Patterns to replace
const replacements = [
  // Simple console.log statements
  {
    pattern: /console\.log\(([^)]+)\);?/g,
    replacement: '// console.log($1); // Removed for production'
  },
  // Console.log with template literals
  {
    pattern: /console\.log\(`([^`]+)`\)/g,
    replacement: '// console.log(`$1`); // Removed for production'
  },
  // Console.error statements (keep these but add logger import)
  {
    pattern: /console\.error\(([^)]+)\);?/g,
    replacement: 'logger.error($1);'
  },
  // Console.warn statements
  {
    pattern: /console\.warn\(([^)]+)\);?/g,
    replacement: 'logger.warn($1);'
  }
]

function shouldExcludeFile(filePath) {
  return excludeFiles.some(exclude => filePath.includes(exclude))
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let newContent = content
    
    // Add logger import if we're replacing console statements
    if (content.includes('console.') && !content.includes("import { logger }")) {
      // Find the last import statement
      const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm
      const imports = content.match(importRegex)
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1]
        const lastImportIndex = content.lastIndexOf(lastImport)
        const insertIndex = lastImportIndex + lastImport.length
        
        newContent = content.slice(0, insertIndex) + 
          "\nimport { logger } from '@/lib/logger'" + 
          content.slice(insertIndex)
      } else {
        // No imports found, add at the top
        newContent = "import { logger } from '@/lib/logger'\n" + content
      }
    }
    
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      newContent = newContent.replace(pattern, replacement)
    })
    
    // Only write if content changed
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8')
      console.log(`✅ Processed: ${filePath}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return false
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath)
  let processedCount = 0
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!shouldExcludeFile(filePath)) {
        processedCount += processDirectory(filePath)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      if (!shouldExcludeFile(filePath)) {
        if (processFile(filePath)) {
          processedCount++
        }
      }
    }
  })
  
  return processedCount
}

// Main execution
console.log('🧹 Starting console.log cleanup...')

const srcDir = path.join(__dirname, '..', 'src')
const processedCount = processDirectory(srcDir)

console.log(`\n✅ Cleanup complete! Processed ${processedCount} files.`)
console.log('\n📝 Note: Some console.log statements were commented out for production.')
console.log('📝 Error and warn statements were replaced with logger calls.')
console.log('📝 Remember to test the application after cleanup!')
