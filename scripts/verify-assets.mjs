import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const expected = new Map();
const hashFile = await readFile(new URL('./asset-hashes.sha256', import.meta.url), 'utf8');
for (const line of hashFile.trim().split(/\r?\n/)) {
  const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
  if (!match) throw new Error(`Malformed asset hash line: ${line}`);
  if (expected.has(match[2])) throw new Error(`Duplicate asset hash entry: ${match[2]}`);
  expected.set(match[2], match[1]);
}
if (expected.size !== 23) throw new Error(`Expected 23 pinned public identity/assets; found ${expected.size}.`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

const protectedExtensions = new Set(['.svg', '.png', '.ico']);
const protectedAssets = (await walk(publicDir))
  .filter((path) => protectedExtensions.has(extname(path).toLowerCase()))
  .map((path) => `public/${relative(publicDir, path).replaceAll('\\', '/')}`)
  .sort();
const expectedAssets = [...expected.keys()].filter((path) => protectedExtensions.has(extname(path).toLowerCase())).sort();
if (JSON.stringify(protectedAssets) !== JSON.stringify(expectedAssets)) {
  throw new Error(`Production image/identity inventory drift. Expected ${expectedAssets.join(', ')}; found ${protectedAssets.join(', ')}.`);
}

const expectedPngDimensions = new Map([
  ['public/favicon-64x64.png', [64, 64]],
  ['public/apple-touch-icon.png', [180, 180]],
  ['public/web-app-icon-192x192.png', [192, 192]],
  ['public/web-app-icon-512x512.png', [512, 512]],
  ['public/web-app-icon-maskable-512x512.png', [512, 512]],
  ['public/web-app-icon-maskable-1024x1024.png', [1024, 1024]],
  ['public/assets/social/macro-evidence_standalone-share_1200x630_v1.png', [1200, 630]],
  ['public/assets/brand/downloads/macro-evidence_mark-primary_1024px_v1.png', [1024, 1024]],
  ['public/assets/brand/downloads/macro-evidence_mark-white_1024px_v1.png', [1024, 1024]],
  ['public/assets/brand/downloads/macro-evidence_mark-black_1024px_v1.png', [1024, 1024]],
  ['public/assets/brand/downloads/macro-evidence_lockup-horizontal-primary_1280px-wide_v1.png', [1280, 381]],
  ['public/assets/brand/downloads/macro-evidence_lockup-horizontal-white_1280px-wide_v1.png', [1280, 381]],
  ['public/assets/brand/downloads/macro-evidence_lockup-horizontal-black_1280px-wide_v1.png', [1280, 381]],
]);

function pngDimensions(bytes, relativePath) {
  const signature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== signature || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`Malformed PNG asset: ${relativePath}`);
  }
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

const manifest = JSON.parse(await readFile(resolve(root, 'public/site.webmanifest'), 'utf8'));
const expectedManifestIcons = [
  ['/web-app-icon-192x192.png', '192x192', 'any'],
  ['/web-app-icon-512x512.png', '512x512', 'any'],
  ['/web-app-icon-maskable-512x512.png', '512x512', 'maskable'],
  ['/web-app-icon-maskable-1024x1024.png', '1024x1024', 'maskable'],
];
if (manifest.name !== 'Macro Evidence' || manifest.short_name !== 'Macro Evidence') throw new Error('Web manifest organization identity metadata is incorrect.');
const actualManifestIcons = (manifest.icons ?? []).map((icon) => [icon.src, icon.sizes, icon.purpose]);
if (JSON.stringify(actualManifestIcons) !== JSON.stringify(expectedManifestIcons)) throw new Error('Web manifest icon routing/sizes/purpose drifted from the approved web-icon inventory.');
for (const icon of manifest.icons ?? []) {
  if (icon.type !== 'image/png') throw new Error(`Unexpected manifest icon MIME type: ${icon.src}`);
  const publicPath = `public${icon.src}`;
  if (!expected.has(publicPath)) throw new Error(`Manifest references an unpinned icon: ${icon.src}`);
}

let failed = false;
for (const [relativePath, digest] of expected) {
  const bytes = await readFile(resolve(root, relativePath));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== digest) {
    failed = true;
    console.error(`FAIL ${relativePath}\n  expected ${digest}\n  actual   ${actual}`);
    continue;
  }
  if (expectedPngDimensions.has(relativePath)) {
    const actualDimensions = pngDimensions(bytes, relativePath);
    const expectedDimensions = expectedPngDimensions.get(relativePath);
    if (actualDimensions[0] !== expectedDimensions[0] || actualDimensions[1] !== expectedDimensions[1]) {
      failed = true;
      console.error(`FAIL ${relativePath}\n  expected dimensions ${expectedDimensions.join('x')}\n  actual dimensions   ${actualDimensions.join('x')}`);
      continue;
    }
  }
  console.log(`OK   ${relativePath}`);
}

if (failed) process.exit(1);
console.log(`Verified ${expected.size} pinned public identity/assets and protected asset inventory.`);
