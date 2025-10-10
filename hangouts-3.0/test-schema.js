// Test script to verify schema configuration
const fs = require('fs');
const path = require('path');

console.log('Checking schema.prisma file...');
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

console.log('Schema content:');
console.log(schemaContent.substring(0, 200));

// Check for provider line
const providerMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);
if (providerMatch) {
  console.log('Database provider:', providerMatch[1]);
} else {
  console.log('No provider found in schema');
}
