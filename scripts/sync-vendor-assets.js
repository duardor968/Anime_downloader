'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vendorDir = path.join(projectRoot, 'public', 'vendor');
const vendorFiles = [
  {
    from: path.join(projectRoot, 'node_modules', 'embla-carousel', 'embla-carousel.umd.js'),
    to: path.join(vendorDir, 'embla-carousel.umd.js')
  }
];

fs.mkdirSync(vendorDir, { recursive: true });

for (const { from, to } of vendorFiles) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing vendor asset: ${path.relative(projectRoot, from)}`);
  }

  fs.copyFileSync(from, to);
  console.log(`[sync:vendor] ${path.relative(projectRoot, from)} -> ${path.relative(projectRoot, to)}`);
}
