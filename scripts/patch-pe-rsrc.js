const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/patch-pe-rsrc.js <exe>');
  process.exit(1);
}

const filePath = path.resolve(target);
const data = fs.readFileSync(filePath);

if (data.readUInt16LE(0) !== 0x5a4d) {
  console.error('[PATCH] Not a valid MZ executable:', filePath);
  process.exit(1);
}

const e_lfanew = data.readUInt32LE(0x3c);
const peSig = data.toString('ascii', e_lfanew, e_lfanew + 4);
if (peSig !== 'PE\u0000\u0000') {
  console.error('[PATCH] PE signature not found:', filePath);
  process.exit(1);
}

const coffOff = e_lfanew + 4;
const numSections = data.readUInt16LE(coffOff + 2);
const optSize = data.readUInt16LE(coffOff + 16);
const optOff = coffOff + 20;
const magic = data.readUInt16LE(optOff);

if (magic !== 0x20b) {
  console.error('[PATCH] Unsupported PE magic:', magic.toString(16));
  process.exit(1);
}

const sectionAlignment = data.readUInt32LE(optOff + 32);
const sizeOfImageOff = optOff + 56;
const secOff = optOff + optSize;

let rsrcOff = null;
let rsrcVals = null;

for (let i = 0; i < numSections; i++) {
  const off = secOff + i * 40;
  const name = data.toString('ascii', off, off + 8).replace(/\0/g, '');
  if (name === '.rsrc') {
    const vsize = data.readUInt32LE(off + 8);
    const vaddr = data.readUInt32LE(off + 12);
    const rawSize = data.readUInt32LE(off + 16);
    const rawPtr = data.readUInt32LE(off + 20);
    rsrcOff = off;
    rsrcVals = { vsize, vaddr, rawSize, rawPtr };
    break;
  }
}

if (!rsrcOff || !rsrcVals) {
  console.error('[PATCH] .rsrc section not found');
  process.exit(1);
}

const patched = Buffer.from(data);
const oldVSize = rsrcVals.vsize;
const newVSize = rsrcVals.rawSize;

if (newVSize !== oldVSize) {
  patched.writeUInt32LE(newVSize, rsrcOff + 8);
}

let lastEnd = 0;
for (let i = 0; i < numSections; i++) {
  const off = secOff + i * 40;
  const vsize = patched.readUInt32LE(off + 8);
  const vaddr = patched.readUInt32LE(off + 12);
  const aligned = Math.ceil(vsize / sectionAlignment) * sectionAlignment;
  const end = vaddr + aligned;
  if (end > lastEnd) lastEnd = end;
}

patched.writeUInt32LE(lastEnd, sizeOfImageOff);

if (!patched.equals(data)) {
  fs.writeFileSync(filePath, patched);
  console.log(`[PATCH] Updated .rsrc VirtualSize ${oldVSize} -> ${newVSize} and SizeOfImage -> 0x${lastEnd.toString(16)}`);
} else {
  console.log('[PATCH] No changes needed');
}
