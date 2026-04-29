const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/ojas/OneDrive/Desktop/ojas/projects/ojas/antigravity jeet bhaiyea project/frontend/src';

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('\\${import.meta.env.VITE_API_URL')) {
        console.log('Fixing syntax in', fullPath);
        // Replace literal \${ with ${
        content = content.replace(/\\\$\{import\.meta\.env\.VITE_API_URL/g, '${import.meta.env.VITE_API_URL');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

walk(dir);
console.log('Done fixing API URLs.');
