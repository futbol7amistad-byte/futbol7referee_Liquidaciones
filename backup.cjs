const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDir('src', '.backup_2026_05_04/src');
  ['package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tailwind.config.js'].forEach(file => {
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join('.backup_2026_05_04', file));
  });
  console.log('Backup completed successfully.');
} catch (e) {
  console.error('Backup failed:', e);
}
