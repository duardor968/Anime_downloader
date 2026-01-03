/**
 * Generates a manifest listing assets to embed in the SEA blob.
 * This keeps server-side extraction simple and predictable.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'sea-assets-manifest.json');
const DIRECTORIES = ['public', 'views'];

function collectFiles(baseDir) {
  const results = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(ROOT, fullPath).replace(/\\/g, '/');
        results.push(rel);
      }
    }
  }
  walk(baseDir);
  return results;
}

const files = [];
for (const dir of DIRECTORIES) {
  const target = path.join(ROOT, dir);
  if (fs.existsSync(target)) {
    files.push(...collectFiles(target));
  }
}

fs.writeFileSync(
  OUTPUT,
  JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2),
  'utf8'
);

console.log(`Asset manifest written to ${path.basename(OUTPUT)} with ${files.length} entries.`);
