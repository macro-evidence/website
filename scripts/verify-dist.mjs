import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

async function mustExist(path, label = relative(dist, path)) {
  try { await stat(path); }
  catch { throw new Error(`Missing built output: ${label}`); }
}

function tagAttributes(tag) {
  return new Map([...tag.matchAll(/([:\w-]+)=["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]]));
}

function metaContent(text, selectorName, selectorValue) {
  const matches = [];
  for (const tag of text.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = tagAttributes(tag);
    if (attrs.get(selectorName) === selectorValue) matches.push(attrs.get('content'));
  }
  return matches;
}

function linkHref(text, relValue) {
  const matches = [];
  for (const tag of text.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = tagAttributes(tag);
    if (attrs.get('rel') === relValue) matches.push(attrs.get('href'));
  }
  return matches;
}

const all = await walk(dist);
const htmlFiles = all.filter((path) => extname(path).toLowerCase() === '.html').sort();
const baseRoutes = [
  '/',
  '/404',
  '/about',
  '/brand-assets',
  '/contact',
  '/contribute',
  '/governance',
  '/licensing',
  '/principles',
  '/privacy',
  '/security',
  '/software',
  '/sponsor',
  '/trademarks',
];
const expectedRoutes = [...baseRoutes].sort();
const routeToHtml = (route) => route === '/' ? 'index.html' : `${route.replace(/^\//, '')}.html`;
const sourcePages = expectedRoutes.map(routeToHtml).sort();
const actualHtml = htmlFiles.map((path) => relative(dist, path).replaceAll('\\', '/')).sort();
if (JSON.stringify(actualHtml) !== JSON.stringify(sourcePages)) {
  throw new Error(`Unexpected HTML route inventory. Expected ${sourcePages.join(', ')}; found ${actualHtml.join(', ')}.`);
}

const routeTargets = new Set(expectedRoutes.filter((route) => route !== '/404'));
const staticHrefPrefixes = ['/_astro/', '/assets/', '/favicon', '/apple-', '/site.webmanifest', '/web-app-', '/theme.js', '/licenses/'];
const htmlEntries = await Promise.all(htmlFiles.map(async (path) => ({ path, text: await readFile(path, 'utf8') })));
const routeHtml = new Map(htmlEntries.map(({ path, text }) => {
  const file = relative(dist, path).replaceAll('\\', '/');
  const route = file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`;
  return [route, text];
}));
const allHtml = htmlEntries.map(({ text }) => text).join('\n');

const forbidden = [
  ['inline style attribute', /\sstyle=["']/i],
  ['inline style element', /<style\b/i],
  ['form', /<form\b/i],
  ['iframe/embed', /<(iframe|embed)\b/i],
  ['service worker', /serviceWorker|service-worker/i],
  ['known browser analytics beacon', /cloudflareinsights|beacon\.min\.js|google-analytics|googletagmanager|plausible|segment\.com/i],
  ['insecure external link', /href=["']http:\/\//i],
  ['new-window default', /target=["']_blank["']/i],
  ['double-escaped HTML entity', /&amp;(?:amp|lt|gt|quot|#39);/i],
];
for (const [label, pattern] of forbidden) if (pattern.test(allHtml)) throw new Error(`Forbidden built output: ${label}`);

const canonicalSeen = new Set();
const titleSeen = new Map();
const descriptionSeen = new Map();
const expectedSocialImage = 'https://macro-evidence.com/assets/social/macro-evidence_standalone-share_1200x630_v1.png';

for (const { path, text } of htmlEntries) {
  const file = relative(dist, path).replaceAll('\\', '/');

  // Only the first-party external theme helper is allowed; structured data uses CSP-compatible microdata.
  for (const scriptTag of text.match(/<script\b[\s\S]*?<\/script>/gi) ?? []) {
    const openTag = scriptTag.match(/^<script\b[^>]*>/i)?.[0] ?? '';
    const attrs = tagAttributes(openTag);
    const src = attrs.get('src');
    if (src) {
      if (src !== '/theme.js') throw new Error(`Unexpected executable script in ${file}: ${src}`);
      await mustExist(join(dist, 'theme.js'), '/theme.js');
    } else {
      throw new Error(`Unexpected inline script block in ${file}.`);
    }
  }

  const internalHref = /href=["'](\/(?!\/)[^"'#?]*)["']/g;
  let match;
  while ((match = internalHref.exec(text))) {
    const rawHref = match[1];
    const href = rawHref.replace(/\/$/, '') || '/';
    if (staticHrefPrefixes.some((prefix) => rawHref.startsWith(prefix))) {
      const staticPath = rawHref.split(/[?#]/)[0];
      if (!staticPath.endsWith('/')) await mustExist(join(dist, staticPath.slice(1)), staticPath);
      continue;
    }
    if (!routeTargets.has(href)) throw new Error(`Unexpected internal route ${href} in ${file}`);
  }

  const h1Count = (text.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) throw new Error(`Expected exactly one h1 in ${file}; found ${h1Count}`);

  const ids = [...text.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) throw new Error(`Duplicate HTML id(s) in ${file}: ${duplicateIds.join(', ')}`);

  if (!/<html\s+lang=["']en["']/i.test(text)) throw new Error(`Missing html lang=en in ${file}`);
  if (!/<main\s+id=["']main-content["']/i.test(text)) throw new Error(`Missing #main-content in ${file}`);
  if (!/href=["']#main-content["'][^>]*>Skip to main content</i.test(text)) throw new Error(`Missing skip link in ${file}`);
  if (!/name=["']theme-color["'][^>]*content=["']#245B8A["']/i.test(text)) throw new Error(`Primary theme-color missing in ${file}`);
  if (!/itemtype=["']https:\/\/schema\.org\/Organization["']/i.test(text)) throw new Error(`Organization microdata missing in ${file}`);
  if (file === 'index.html' && !/itemtype=["']https:\/\/schema\.org\/WebSite["']/i.test(text)) throw new Error('Homepage WebSite microdata is missing.');
  if (file !== 'index.html' && /itemtype=["']https:\/\/schema\.org\/WebSite["']/i.test(text)) throw new Error(`WebSite microdata must remain homepage-only: ${file}`);

  for (const image of text.match(/<img\b[^>]*>/gi) || []) {
    const attrs = tagAttributes(image);
    if (!attrs.has('alt')) throw new Error(`Image without alt attribute in ${file}: ${image}`);
    for (const dimension of ['width', 'height']) {
      const value = attrs.get(dimension);
      if (!value || !/^\d+$/.test(value) || Number(value) <= 0) {
        throw new Error(`Image without positive intrinsic ${dimension} in ${file}: ${image}`);
      }
    }
  }

  const stylesheetTags = text.match(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi) ?? [];
  if (!stylesheetTags.length) throw new Error(`No external stylesheet link found in ${file}.`);
  for (const tag of stylesheetTags) {
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || !href.startsWith('/_astro/') || !href.endsWith('.css')) throw new Error(`Unexpected stylesheet reference in ${file}: ${tag}`);
    await mustExist(join(dist, href.slice(1)), href);
  }

  const fontPreloads = [];
  for (const tag of text.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = tagAttributes(tag);
    if (attrs.get('rel') === 'preload' && attrs.get('as') === 'font') fontPreloads.push(attrs);
  }
  if (fontPreloads.length !== 1) throw new Error(`Expected exactly one font preload in ${file}; found ${fontPreloads.length}.`);
  const fontPreload = fontPreloads[0];
  const fontHref = fontPreload.get('href');
  if (!fontHref || !fontHref.startsWith('/_astro/') || !fontHref.endsWith('.woff2')) {
    throw new Error(`Unexpected font preload href in ${file}: ${fontHref ?? '(missing)'}`);
  }
  if (fontPreload.get('type') !== 'font/woff2') throw new Error(`Font preload must declare font/woff2 in ${file}.`);
  if (fontPreload.get('crossorigin') !== 'anonymous') throw new Error(`Font preload must use crossorigin=anonymous in ${file}.`);
  await mustExist(join(dist, fontHref.slice(1)), fontHref);

  const canonicalValues = linkHref(text, 'canonical');
  if (canonicalValues.length !== 1 || !canonicalValues[0]) throw new Error(`Expected exactly one canonical URL in ${file}; found ${canonicalValues.length}.`);
  const canonical = canonicalValues[0];
  if (!canonical.startsWith('https://macro-evidence.com/')) throw new Error(`Canonical URL has unexpected origin in ${file}: ${canonical}`);
  if (canonical !== 'https://macro-evidence.com/' && canonical.endsWith('/')) throw new Error(`Canonical URL must use no trailing slash in ${file}: ${canonical}`);
  if (canonicalSeen.has(canonical)) throw new Error(`Duplicate canonical URL: ${canonical}`);
  canonicalSeen.add(canonical);

  const canonicalPath = new URL(canonical).pathname;
  const expectedPath = file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`;
  if (canonicalPath !== expectedPath) throw new Error(`Canonical route mismatch in ${file}: expected ${expectedPath}, found ${canonicalPath}`);

  const titleMatches = [...text.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((m) => m[1].trim());
  if (titleMatches.length !== 1 || !titleMatches[0]) throw new Error(`Expected exactly one non-empty title in ${file}; found ${titleMatches.length}.`);
  const title = titleMatches[0];
  if (titleSeen.has(title)) throw new Error(`Duplicate page title in ${file}; already used by ${titleSeen.get(title)}: ${title}`);
  titleSeen.set(title, file);

  const descriptionValues = metaContent(text, 'name', 'description');
  if (descriptionValues.length !== 1 || !descriptionValues[0]?.trim()) throw new Error(`Expected exactly one non-empty meta description in ${file}; found ${descriptionValues.length}.`);
  const description = descriptionValues[0].trim();
  if (descriptionSeen.has(description)) throw new Error(`Duplicate meta description in ${file}; already used by ${descriptionSeen.get(description)}.`);
  descriptionSeen.set(description, file);

  const robotsValues = metaContent(text, 'name', 'robots').filter(Boolean);
  if (file === '404.html') {
    if (robotsValues.length !== 1 || !/\bnoindex\b/i.test(robotsValues[0])) throw new Error('404 page must emit a noindex directive.');
  } else if (robotsValues.some((value) => /\bnoindex\b/i.test(value))) {
    throw new Error(`Indexable page must not emit noindex in ${file}.`);
  }

  const ogUrlValues = metaContent(text, 'property', 'og:url');
  if (ogUrlValues.length !== 1 || ogUrlValues[0] !== canonical) throw new Error(`OpenGraph URL must appear exactly once and match canonical in ${file}.`);
  for (const [selectorName, selectorValue, expected] of [
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
  ]) {
    const values = metaContent(text, selectorName, selectorValue);
    if (values.length !== 1 || values[0] !== expected) throw new Error(`${selectorValue} must appear exactly once and match page metadata in ${file}.`);
  }
  for (const [selectorName, selectorValue] of [['property', 'og:image'], ['name', 'twitter:image']]) {
    const values = metaContent(text, selectorName, selectorValue);
    if (values.length !== 1 || values[0] !== expectedSocialImage) throw new Error(`${selectorValue} must use the expected absolute social image in ${file}.`);
  }
  const twitterCard = metaContent(text, 'name', 'twitter:card');
  if (twitterCard.length !== 1 || twitterCard[0] !== 'summary_large_image') throw new Error(`twitter:card must be summary_large_image exactly once in ${file}.`);
}

const firstPublicationYear = 2026;
const buildYear = new Date().getUTCFullYear();
if (buildYear < firstPublicationYear) throw new Error(`Build year ${buildYear} predates first publication year.`);
const expectedCopyright = buildYear === firstPublicationYear
  ? `© ${firstPublicationYear} Macro Evidence`
  : `© ${firstPublicationYear}–${buildYear} Macro Evidence`;
for (const [route, html] of routeHtml) {
  if (!html.includes(expectedCopyright)) throw new Error(`Generated copyright year is incorrect in ${route}.`);
}

const securityHtml = routeHtml.get('/security');
if (!securityHtml) throw new Error('Security route is missing from built output.');
for (const required of [
  'href="mailto:security@macro-evidence.com"',
  'href="https://github.com/macro-evidence/.github/blob/main/SECURITY.md"',
]) {
  if (!securityHtml.includes(required)) {
    throw new Error(`Built Security route missing required reporting destination: ${required}`);
  }
}

await mustExist(join(dist, new URL(expectedSocialImage).pathname.slice(1)), new URL(expectedSocialImage).pathname);
for (const required of ['sitemap-index.xml', 'robots.txt', '_headers', '.well-known/security.txt', 'theme.js']) {
  await mustExist(join(dist, required), required);
}

const sitemapFiles = all.filter((path) => /^sitemap.*\.xml$/i.test(basename(path)));
if (sitemapFiles.length < 2) throw new Error('Expected sitemap index plus generated sitemap file.');
for (const path of sitemapFiles) {
  const text = await readFile(path, 'utf8');
  if (/https:\/\/macro-evidence\.com\/404(?:<|\/|\.html)/i.test(text)) throw new Error('404 route must not appear in sitemap.');
}

const cssFiles = all.filter((path) => extname(path).toLowerCase() === '.css');
if (!cssFiles.length) throw new Error('Expected at least one emitted external CSS asset.');

const woff2Files = all.filter((path) => extname(path).toLowerCase() === '.woff2');
if (woff2Files.length !== 1) throw new Error(`Expected exactly one emitted WOFF2 webfont asset; found ${woff2Files.length}.`);
if (!relative(dist, woff2Files[0]).replaceAll('\\', '/').startsWith('_astro/')) {
  throw new Error(`Webfont must be emitted as a first-party Astro asset: ${relative(dist, woff2Files[0])}`);
}
const emittedCss = (await Promise.all(cssFiles.map((path) => readFile(path, 'utf8')))).join('\n');
// Unicode coverage is enforced against the authored font-face in verify-source.mjs.
// Do not couple dist verification to a minifier-specific unicode-range serialization;
// dist verification instead proves the emitted first-party font asset, preload, and font behavior.
for (const [label, pattern] of [
  ['Inter @font-face', /@font-face\{[^}]*font-family:\s*["']?Inter Variable["']?/i],
  ['font-display swap', /font-display:\s*swap/i],
  ['variable weight range', /font-weight:\s*100\s+900/i],
  ['Inter primary family', /font-family:\s*["']?Inter Variable["']?\s*,\s*ui-sans-serif\s*,\s*system-ui/i],
  ['optical sizing', /font-optical-sizing:\s*auto/i],
]) {
  if (!pattern.test(emittedCss)) throw new Error(`Built stylesheet missing ${label}.`);
}
if (/url\(\s*["']?https?:\/\//i.test(emittedCss)) throw new Error('Built stylesheets must not load remote font or asset origins.');

const apacheLicensePath = join(dist, 'licenses', 'apache-2.0.txt');
await mustExist(apacheLicensePath, 'licenses/apache-2.0.txt');
if (await readFile(apacheLicensePath, 'utf8') !== await readFile(join(root, 'LICENSE'), 'utf8')) {
  throw new Error('Built Apache-2.0 license text must match the repository root LICENSE exactly.');
}

const ccLicensePath = join(dist, 'licenses', 'cc-by-sa-4.0.txt');
await mustExist(ccLicensePath, 'licenses/cc-by-sa-4.0.txt');
if (await readFile(ccLicensePath, 'utf8') !== await readFile(join(root, 'LICENSE-CONTENT'), 'utf8')) {
  throw new Error('Built CC BY-SA 4.0 license text must match LICENSE-CONTENT exactly.');
}

const interLicensePath = join(dist, 'licenses', 'inter-OFL-1.1.txt');
await mustExist(interLicensePath, 'licenses/inter-OFL-1.1.txt');
const interLicense = await readFile(interLicensePath, 'utf8');
for (const required of [
  'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
  'Permission is hereby granted, free of charge, to any person obtaining',
]) {
  if (!interLicense.includes(required)) throw new Error(`Built Inter OFL text missing required text: ${required}`);
}

const interNoticePath = join(dist, 'licenses', 'inter-NOTICE.txt');
await mustExist(interNoticePath, 'licenses/inter-NOTICE.txt');
const interNotice = await readFile(interNoticePath, 'utf8');
for (const required of [
  'Package: @fontsource-variable/inter@5.3.0',
  'Upstream attribution (verbatim from package metadata):',
  'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)',
  'License: SIL Open Font License 1.1 (OFL-1.1)',
  'See inter-OFL-1.1.txt in this directory',
]) {
  if (!interNotice.includes(required)) throw new Error(`Built Inter attribution notice missing required text: ${required}`);
}

const headers = await readFile(join(dist, '_headers'), 'utf8');
for (const required of [
  'Content-Security-Policy:',
  "default-src 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  'Referrer-Policy: strict-origin-when-cross-origin',
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
  'Strict-Transport-Security: max-age=31536000',
  'Permissions-Policy:',
  'Cache-Control: public, max-age=31536000, immutable',
]) {
  if (!headers.includes(required)) throw new Error(`Missing security/cache directive: ${required}`);
}
if (/unsafe-inline|unsafe-eval/i.test(headers)) throw new Error('Built CSP must not allow unsafe inline/eval execution.');
if (/includeSubDomains|preload/i.test(headers)) throw new Error('Built HSTS policy must not bind unrelated/future subdomains.');
if (/img-src[^;]*data:/i.test(headers)) throw new Error('Built CSP must not allow data images.');
if (/font-src[^;]*https?:/i.test(headers)) throw new Error('Built CSP must not allow remote font origins.');

const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: https://macro-evidence.com/sitemap-index.xml')) throw new Error('robots.txt sitemap URL is missing or incorrect.');
if (/Content-Signal|ai-train|ai-input/i.test(robots)) throw new Error('Unexpected AI-use policy found in built robots.txt.');

const securityTxt = await readFile(join(dist, '.well-known', 'security.txt'), 'utf8');
for (const required of [
  'Contact: mailto:security@macro-evidence.com',
  'Canonical: https://macro-evidence.com/.well-known/security.txt',
  'Policy: https://macro-evidence.com/security',
]) {
  if (!securityTxt.includes(required)) throw new Error(`Built security.txt missing required field: ${required}`);
}
const expiresMatch = securityTxt.match(/^Expires:\s*(\S+)$/mi);
if (!expiresMatch) throw new Error('Built security.txt is missing Expires.');
const expiresAt = Date.parse(expiresMatch[1]);
if (!Number.isFinite(expiresAt)) throw new Error(`Built security.txt has invalid Expires value: ${expiresMatch[1]}`);
const now = Date.now();
if (expiresAt <= now) throw new Error(`Built security.txt expired at ${expiresMatch[1]}.`);
if (expiresAt - now > 366 * 24 * 60 * 60 * 1000) throw new Error('Built security.txt Expires must remain within one year of verification.');

console.log(`Built-output constraints verified across ${htmlFiles.length} HTML pages.`);
