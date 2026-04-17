const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const vendorsDir = path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'vendors');

// Read the UPDATED file
const updatedFile = path.join(vendorsDir, 'index.UPDATED.tsx');
const targetFile = path.join(vendorsDir, 'index.tsx');
const modernFile = path.join(vendorsDir, 'index.MODERN.tsx');

try {
  console.log('Reading UPDATED file...');
  const content = fs.readFileSync(updatedFile, 'utf8');
  
  console.log('Writing to index.tsx...');
  fs.writeFileSync(targetFile, content, 'utf8');
  
  console.log('Deleting UPDATED file...');
  fs.unlinkSync(updatedFile);
  
  console.log('Deleting MODERN file...');
  if (fs.existsSync(modernFile)) {
    fs.unlinkSync(modernFile);
  }
  
  console.log('✅ Vendors page successfully replaced!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
