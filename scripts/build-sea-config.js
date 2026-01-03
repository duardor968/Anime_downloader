/**
 * Build a SEA config that inlines all assets from the manifest.
 * Reads sea-config.json as base and writes sea-config.generated.json
 * with an assets map of every file listed in sea-assets-manifest.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const baseConfigPath = path.join(ROOT, 'sea-config.json');
const manifestPath = path.join(ROOT, 'sea-assets-manifest.json');
const outputPath = path.join(ROOT, 'sea-config.generated.json');

const base = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const assets = {
  'sea-assets-manifest.json': './sea-assets-manifest.json',
};
(manifest.files || []).forEach((rel) => {
  assets[rel] = `./${rel}`;
});

const finalConfig = { ...base, assets };
fs.writeFileSync(outputPath, JSON.stringify(finalConfig, null, 2));

console.log(`SEA config generated at ${path.basename(outputPath)} with ${Object.keys(assets).length} assets.`);
