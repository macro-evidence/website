import { readdir, readFile, stat } from 'node:fs/promises';
import { parse as parseJsonc, printParseErrorCode } from 'jsonc-parser';
import { basename, extname, join, relative } from 'node:path';

const root = process.cwd();
const src = join(root, 'src');
const publicDir = join(root, 'public');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      [
        'node_modules',
        'dist',
        '.astro',
        '.git',
        '.wrangler',
        '.vscode',
        '.idea',
      ].includes(entry.name)
    )
      continue;

    if (entry.name === 'commit_message.txt') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

async function mustExist(path, label = relative(root, path)) {
  try {
    await stat(path);
  } catch {
    throw new Error(`Missing required repository file: ${label}`);
  }
}

const requiredFiles = [
  'README.md',
  'BRAND_ASSETS.md',
  'LICENSING.md',
  'THIRD_PARTY_NOTICES.md',
  'LICENSE',
  'LICENSE-CONTENT',
  '.npmrc',
  '.nvmrc',
  '.github/workflows/verification.yml',
  'astro.config.mjs',
  'package.json',
  'package-lock.json',
  'eslint.config.mjs',
  'prettier.config.mjs',
  '.markdownlint-cli2.jsonc',
  'wrangler.jsonc',
  'public/_headers',
  'public/robots.txt',
  'public/llms.txt',
  'public/theme.js',
  'public/.well-known/security.txt',
  'scripts/copy-license-files.mjs',
  'scripts/verify-source.mjs',
  'scripts/verify-assets.mjs',
  'scripts/verify-dist.mjs',
  'src/layouts/Layout.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/components/ThemeControl.astro',
  'src/components/PublicRecordCard.astro',
  'src/pages/governance.astro',
  'src/pages/contribute.astro',
  'src/pages/security.astro',
  'src/pages/trademarks.astro',
  'src/pages/licensing.astro',
  'src/styles/global.css',
  'src/styles/fonts.css',
  'decisions/README.md',
];
for (const path of requiredFiles) await mustExist(join(root, path), path);

const repoFiles = await walk(root);
const sourceFiles = repoFiles.filter(
  (path) => path.startsWith(`${src}/`) || path.startsWith(`${src}\\`),
);
const sourceTexts = await Promise.all(
  sourceFiles
    .filter((path) =>
      ['.astro', '.css', '.ts', '.js', '.mjs'].includes(
        extname(path).toLowerCase(),
      ),
    )
    .map(async (path) => ({ path, text: await readFile(path, 'utf8') })),
);
const sourceText = sourceTexts
  .map(({ path, text }) => `${relative(root, path)}\n${text}`)
  .join('\n');

const forbiddenSource = [
  ['form markup', /<form\b/i],
  ['iframe/embed', /<(iframe|embed)\b/i],
  ['inline style attribute', /\sstyle=["']/i],
  ['service worker', /serviceWorker|service-worker|navigator\.serviceWorker/i],
  [
    'remote font origin',
    /fonts\.googleapis\.com|fonts\.gstatic\.com|rsms\.me\/inter\/inter\.css|cdn\.jsdelivr\.net\/fontsource/i,
  ],
  [
    'known browser analytics beacon',
    /cloudflareinsights|beacon\.min\.js|google-analytics|googletagmanager|plausible|segment\.com/i,
  ],
  ['new-window default', /target=["']_blank["']/i],
  ['insecure external link', /href=["']http:\/\//i],
];
for (const [label, pattern] of forbiddenSource) {
  if (pattern.test(sourceText))
    throw new Error(`Forbidden source pattern found: ${label}`);
}

// Canonical public records remain at their owning repositories. GitHub-destination
// disclosure is a visitor-facing editorial/interface requirement; verification does not
// encode ordinary link-label wording as repository policy.

// Persistent browser state is intentionally limited to the first-party theme helper.
for (const { path, text } of sourceTexts) {
  if (relative(root, path).replaceAll('\\', '/') === 'public/theme.js')
    continue;
  if (/\blocalStorage\b|\bsessionStorage\b|document\.cookie/i.test(text)) {
    throw new Error(
      `Unexpected browser persistence API in ${relative(root, path)}`,
    );
  }
}

const themeJs = await readFile(join(publicDir, 'theme.js'), 'utf8');
for (const forbidden of [
  ['network fetch', /\bfetch\s*\(/],
  ['XHR', /XMLHttpRequest/],
  ['sendBeacon', /sendBeacon/],
  ['cookie', /document\.cookie/],
  ['session storage', /sessionStorage/],
]) {
  if (forbidden[1].test(themeJs))
    throw new Error(`Theme helper must not use ${forbidden[0]}.`);
}
if (!themeJs.includes("const key = 'macro-evidence-theme'"))
  throw new Error('Theme helper preference key changed unexpectedly.');
if (
  !themeJs.includes('localStorage.getItem(key)') ||
  !themeJs.includes('localStorage.setItem(key, preference)')
) {
  throw new Error(
    'Theme helper must use only the documented first-party preference key.',
  );
}

const layout = await readFile(join(src, 'layouts', 'Layout.astro'), 'utf8');
if (!layout.includes('<script is:inline src="/theme.js"></script>'))
  throw new Error(
    'Layout must load the first-party theme helper from /theme.js.',
  );
if (/src=["']https?:\/\//i.test(layout))
  throw new Error(
    'Layout must not load third-party scripts or assets directly.',
  );
if (
  !layout.includes(
    "import interVariable from '@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url';",
  )
) {
  throw new Error(
    'Layout must import the exact-pinned Inter variable font asset for preload.',
  );
}
const fontPreloadTag = layout.match(
  /<link\b[^>]*href=\{interVariable\}[^>]*>/i,
)?.[0];
if (
  !fontPreloadTag ||
  !/\brel="preload"/i.test(fontPreloadTag) ||
  !/\bas="font"/i.test(fontPreloadTag) ||
  !/\btype="font\/woff2"/i.test(fontPreloadTag) ||
  !/\bcrossorigin="anonymous"/i.test(fontPreloadTag)
) {
  throw new Error('Layout must preload the first-party Inter webfont.');
}
if (!layout.includes('itemtype="https://schema.org/WebSite"'))
  throw new Error(
    'Homepage WebSite structured-data implementation is missing.',
  );
if (!layout.includes('<link rel="describedby" href="/llms.txt" />'))
  throw new Error(
    'Layout must advertise the first-party /llms.txt discovery index.',
  );
for (const required of [
  'itemid="https://macro-evidence.com/#website"',
  '<link itemprop="url" href="https://macro-evidence.com/" />',
  '<meta itemprop="name" content="Macro Evidence" />',
]) {
  if (!layout.includes(required))
    throw new Error(
      `Homepage WebSite microdata constraint missing: ${required}`,
    );
}
const footer = await readFile(join(src, 'components', 'Footer.astro'), 'utf8');
if (!footer.includes('itemtype="https://schema.org/Organization"'))
  throw new Error(
    'Organization structured-data implementation is missing from the footer.',
  );
for (const required of [
  'itemid="https://macro-evidence.com/#organization"',
  '<meta itemprop="name" content="Macro Evidence" />',
  'content="Macro Evidence is a software organization building open macroeconomic data infrastructure."',
  '<link itemprop="url" href="https://macro-evidence.com/" />',
  'href="https://macro-evidence.com/web-app-icon-512x512.png"',
  'href="https://github.com/macro-evidence"',
  'href="https://www.linkedin.com/company/macro-evidence"',
  'href="https://www.youtube.com/@macro-evidence"',
  'href="https://bsky.app/profile/macro-evidence.com"',
  'href="https://www.crunchbase.com/organization/macro-evidence"',
]) {
  if (!footer.includes(required))
    throw new Error(`Organization microdata constraint missing: ${required}`);
}
if (!footer.includes("href: '/licensing'"))
  throw new Error('Footer must expose the first-party /licensing route.');
for (const required of [
  'const firstPublicationYear = 2026;',
  'new Date().getUTCFullYear()',
  '`${firstPublicationYear}–${buildYear}`',
]) {
  if (!footer.includes(required))
    throw new Error(`Footer copyright-year constraint missing: ${required}`);
}
if (!footer.includes('pathname === href || pathname.startsWith(`${href}/`)')) {
  throw new Error(
    'Footer current-route behavior must include nested first-party routes.',
  );
}
const header = await readFile(join(src, 'components', 'Header.astro'), 'utf8');
if (!header.includes('pathname === href || pathname.startsWith(`${href}/`)')) {
  throw new Error(
    'Header current-route behavior must include nested first-party routes.',
  );
}
const recordCard = await readFile(
  join(src, 'components', 'PublicRecordCard.astro'),
  'utf8',
);
if (/<a\s+class="record-card"/i.test(recordCard))
  throw new Error('PublicRecordCard must not wrap the full card in one link.');
if (
  !recordCard.includes('<article class="record-card">') ||
  !recordCard.includes('<a class="record-link" href={href}>')
) {
  throw new Error(
    'PublicRecordCard must expose one explicit record link inside a non-link card container.',
  );
}
if (/application\/ld\+json/i.test(layout))
  throw new Error(
    'Inline JSON-LD must not bypass the strict CSP; use CSP-compatible microdata.',
  );

const css = sourceTexts
  .filter(({ path }) => extname(path).toLowerCase() === '.css')
  .map(({ text }) => text)
  .join('\n');
for (const token of ['#245b8a', '#050816', '#f8fafc', '#ffffff']) {
  if (!css.toLowerCase().includes(token))
    throw new Error(`Required organization palette token missing: ${token}`);
}
for (const required of [
  '@media (prefers-reduced-motion: reduce)',
  '@media print',
]) {
  if (!css.includes(required))
    throw new Error(
      `Required accessibility/resilience CSS missing: ${required}`,
    );
}
for (const [label, pattern] of [
  ['Inter font family', /font-family:\s*['"]Inter Variable['"]/],
  ['font display', /font-display:\s*swap\b/],
  ['variable font weight range', /font-weight:\s*100\s+900\b/],
  [
    'Inter font asset path',
    /@fontsource-variable\/inter\/files\/inter-latin-opsz-normal\.woff2/,
  ],
  ['optical sizing', /font-optical-sizing:\s*auto\b/],
  ['Latin unicode range', /unicode-range:[^}]*U\+0000-00FF/i],
]) {
  if (!pattern.test(css))
    throw new Error(
      `Required first-party Inter font constraint missing: ${label}`,
    );
}
if (/url\(\s*["']?https?:\/\//i.test(css))
  throw new Error('Stylesheets must not load remote font or asset origins.');

const licenseCopyScript = await readFile(
  join(root, 'scripts', 'copy-license-files.mjs'),
  'utf8',
);
for (const required of [
  "join(root, 'LICENSE')",
  "join(root, 'LICENSE-CONTENT')",
  "distLicenses, 'apache-2.0.txt'",
  "distLicenses, 'cc-by-sa-4.0.txt'",
  "node_modules', '@fontsource-variable', 'inter'",
  "join(packageRoot, 'package.json')",
  "join(packageRoot, 'metadata.json')",
  "join(packageRoot, 'LICENSE')",
  "distLicenses, 'inter-OFL-1.1.txt'",
  "distLicenses, 'inter-NOTICE.txt'",
  "packageManifest.name !== '@fontsource-variable/inter'",
  "packageManifest.version !== '5.3.0'",
  "packageManifest.license !== 'OFL-1.1'",
  "metadata?.license?.type !== 'OFL-1.1'",
  'metadata?.license?.attribution',
  'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)',
  'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
]) {
  if (!licenseCopyScript.includes(required))
    throw new Error(`License copy constraint missing: ${required}`);
}

const packageJson = JSON.parse(
  await readFile(join(root, 'package.json'), 'utf8'),
);
if (packageJson.license !== 'Apache-2.0')
  throw new Error(
    'package.json must identify the website software package as Apache-2.0.',
  );
const packageLock = JSON.parse(
  await readFile(join(root, 'package-lock.json'), 'utf8'),
);
const lockRoot = packageLock.packages?.[''];
if (!lockRoot)
  throw new Error('package-lock.json is missing the root package record.');
for (const field of ['name', 'version', 'license']) {
  if (lockRoot[field] !== packageJson[field])
    throw new Error(`package-lock root ${field} must match package.json.`);
}
if (packageJson.packageManager !== 'npm@12.0.2')
  throw new Error('Unexpected packageManager baseline.');
if (
  packageJson.engines?.node !== '24.21.0' ||
  packageJson.engines?.npm !== '12.0.2'
)
  throw new Error('Unexpected Node/npm release baseline.');
for (const dependencyGroup of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(
    packageJson[dependencyGroup] ?? {},
  )) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
      throw new Error(
        `Direct dependency must be exactly pinned: ${name}@${version}`,
      );
  }
}
if (packageJson.dependencies?.['@fontsource-variable/inter'] !== '5.3.0') {
  throw new Error(
    'Inter build dependency must remain exactly pinned to @fontsource-variable/inter@5.3.0.',
  );
}
if (packageJson.devDependencies?.['markdownlint-cli2'] !== '0.23.3')
  throw new Error(
    'Markdown lint dependency must remain exactly pinned to markdownlint-cli2@0.23.3.',
  );
if (packageJson.overrides?.['markdownlint-cli2']?.['smol-toml'] !== '1.7.1')
  throw new Error(
    'The reviewed markdownlint-cli2 smol-toml security override must remain pinned to 1.7.1.',
  );

const markdownlintText = await readFile(
  join(root, '.markdownlint-cli2.jsonc'),
  'utf8',
);
const markdownlintParseErrors = [];
const markdownlintConfig = parseJsonc(
  markdownlintText,
  markdownlintParseErrors,
  {
    allowTrailingComma: true,
  },
);
if (markdownlintParseErrors.length > 0)
  throw new Error('.markdownlint-cli2.jsonc contains invalid JSONC.');
if (
  markdownlintConfig?.config?.default !== true ||
  markdownlintConfig?.config?.MD013 !== false
)
  throw new Error(
    'Markdown lint baseline must enable default rules while disabling MD013 line-length enforcement.',
  );
if (markdownlintConfig?.gitignore !== '.gitignore')
  throw new Error('Markdown lint must honor the repository .gitignore.');
const expectedMarkdownIgnores = ['node_modules/**', 'dist/**', '.astro/**'];
if (
  JSON.stringify(markdownlintConfig?.ignores ?? []) !==
  JSON.stringify(expectedMarkdownIgnores)
)
  throw new Error(
    'Markdown lint generated/dependency ignore inventory drifted.',
  );

const prettierConfig = await readFile(
  join(root, 'prettier.config.mjs'),
  'utf8',
);
if (
  !prettierConfig.includes("files: '**/*.jsonc'") ||
  !prettierConfig.includes("trailingComma: 'none'")
)
  throw new Error(
    'Prettier must keep repository JSONC files warning-free by disabling trailing commas for JSONC.',
  );
for (const [name, expected] of Object.entries({
  'verify:source': 'node scripts/verify-source.mjs',
  'verify:assets': 'node scripts/verify-assets.mjs',
  'verify:dist': 'node scripts/verify-dist.mjs',
  'copy:licenses': 'node scripts/copy-license-files.mjs',
  format:
    'prettier --write src/**/*.{astro,css,ts,js} public/**/*.js scripts/**/*.mjs *.{mjs,json,jsonc} .github/**/*.{yml,yaml}',
  'format:check':
    'prettier --check src/**/*.{astro,css,ts,js} public/**/*.js scripts/**/*.mjs *.{mjs,json,jsonc} .github/**/*.{yml,yaml}',
  'lint:code':
    'eslint "src/**/*.astro" "public/**/*.js" "scripts/**/*.mjs" "*.mjs"',
  'lint:markdown': 'markdownlint-cli2 "**/*.md"',
  lint: 'npm run lint:code && npm run lint:markdown',
  build:
    'npm run format:check && npm run lint && npm run verify:source && npm run verify:assets && astro check && astro build && npm run copy:licenses && npm run verify:dist',
  'release:verify':
    'npm run build && npm audit --omit=dev --audit-level=moderate',
})) {
  if (packageJson.scripts?.[name] !== expected)
    throw new Error(`Package script ${name} is missing or drifted.`);
}
for (const mirrorScript of [
  'verify:canonical-records',
  'check:canonical-records',
  'sync:canonical-records',
]) {
  if (mirrorScript in (packageJson.scripts ?? {})) {
    throw new Error(
      `Canonical-record mirror package script is not permitted: ${mirrorScript}`,
    );
  }
}
const interLock =
  packageLock.packages?.['node_modules/@fontsource-variable/inter'];
if (
  !interLock ||
  interLock.version !== '5.3.0' ||
  interLock.resolved !==
    'https://registry.npmjs.org/@fontsource-variable/inter/-/inter-5.3.0.tgz' ||
  interLock.integrity !==
    'sha512-OupL48va4JNofb97w6NYeF9S7W/kHNKM0Er8Dem5nqi4jeOLrVJDoE8tZEpnMJmtkvNbB1EIPPwHcdkF6b1oUA==' ||
  interLock.license !== 'OFL-1.1'
) {
  throw new Error('Inter dependency lock/provenance constraint drifted.');
}
const fontsourcePackages = Object.keys(packageLock.packages ?? {}).filter(
  (path) => path.startsWith('node_modules/@fontsource'),
);
if (
  JSON.stringify(fontsourcePackages) !==
  JSON.stringify(['node_modules/@fontsource-variable/inter'])
) {
  throw new Error(
    `Unexpected Fontsource package inventory: ${fontsourcePackages.join(', ')}`,
  );
}
if (
  JSON.stringify(packageJson.allowScripts ?? {}) !==
  JSON.stringify({ 'esbuild@0.28.1': true })
) {
  throw new Error('npm lifecycle-script allowlist drifted.');
}

const nvmrc = (await readFile(join(root, '.nvmrc'), 'utf8')).trim();
if (nvmrc !== '24.21.0') throw new Error(`Unexpected .nvmrc value: ${nvmrc}`);
const npmrc = await readFile(join(root, '.npmrc'), 'utf8');
for (const required of [
  'strict-allow-scripts=true',
  'engine-strict=true',
  'audit=true',
]) {
  if (!npmrc.includes(required))
    throw new Error(`npm safety constraint missing: ${required}`);
}

const astroConfig = await readFile(join(root, 'astro.config.mjs'), 'utf8');
for (const required of [
  "site: 'https://macro-evidence.com'",
  "output: 'static'",
  "trailingSlash: 'never'",
  "inlineStylesheets: 'never'",
  'sitemap()',
]) {
  if (!astroConfig.includes(required))
    throw new Error(`Astro release constraint missing: ${required}`);
}

const headers = await readFile(join(publicDir, '_headers'), 'utf8');
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
]) {
  if (!headers.includes(required))
    throw new Error(`Security header constraint missing: ${required}`);
}
if (/unsafe-inline|unsafe-eval/i.test(headers))
  throw new Error('CSP must not enable unsafe inline/eval execution.');
if (/font-src[^;]*https?:/i.test(headers))
  throw new Error('CSP must not allow remote font origins.');
if (/Content-Signal|ai-train|ai-input/i.test(headers))
  throw new Error(
    "AI-use response policy is outside the website repository's current rights model.",
  );
if (/includeSubDomains|preload/i.test(headers))
  throw new Error('HSTS must not silently bind unrelated/future subdomains.');

const robots = await readFile(join(publicDir, 'robots.txt'), 'utf8');
const expectedRobots =
  'User-agent: *\nAllow: /\n\nSitemap: https://macro-evidence.com/sitemap-index.xml';
if (robots.replaceAll('\r\n', '\n').trim() !== expectedRobots)
  throw new Error(
    'robots.txt must retain the deliberate allow-all crawl contract plus canonical sitemap discovery.',
  );
if (/Content-Signal|ai-train|ai-input/i.test(robots))
  throw new Error(
    "AI-use policy is outside the website repository's current robots.txt contract.",
  );

const llms = await readFile(join(publicDir, 'llms.txt'), 'utf8');
for (const required of [
  '# Macro Evidence',
  '> Macro Evidence is a software organization building open macroeconomic data infrastructure.',
  'Canonical website: https://macro-evidence.com/',
  'https://github.com/macro-evidence/governance/blob/main/ORGANIZATION_CHARTER.md',
  'https://github.com/macro-evidence/governance/blob/main/GOVERNANCE.md',
  'https://github.com/macro-evidence/governance/blob/main/DOCUMENTATION_STANDARDS.md',
  'https://github.com/macro-evidence/governance/blob/main/CONTRIBUTION_POLICY.md',
  'https://github.com/macro-evidence/governance/blob/main/TRADEMARKS.md',
  'https://github.com/macro-evidence/.github/blob/main/SECURITY.md',
  'https://github.com/macro-evidence/macro-data-observatory',
  'https://github.com/macro-evidence',
  'https://www.linkedin.com/company/macro-evidence',
  'https://www.youtube.com/@macro-evidence',
  'https://bsky.app/profile/macro-evidence.com',
]) {
  if (!llms.includes(required))
    throw new Error(
      `llms.txt missing required first-party/canonical reference: ${required}`,
    );
}
if (!/under active development/i.test(llms))
  throw new Error(
    'llms.txt must preserve the current MDO development-state qualifier.',
  );

const securityTxt = await readFile(
  join(publicDir, '.well-known', 'security.txt'),
  'utf8',
);
for (const required of [
  'Contact: mailto:security@macro-evidence.com',
  'Canonical: https://macro-evidence.com/.well-known/security.txt',
  'Policy: https://macro-evidence.com/security',
]) {
  if (!securityTxt.includes(required))
    throw new Error(`security.txt missing required field: ${required}`);
}
const securityExpires = securityTxt.match(/^Expires:\s*(\S+)$/im)?.[1];
if (!securityExpires || !Number.isFinite(Date.parse(securityExpires)))
  throw new Error('security.txt must contain a valid Expires field.');
const securityExpiryMs = Date.parse(securityExpires);
if (securityExpiryMs <= Date.now())
  throw new Error(`security.txt expired at ${securityExpires}.`);
if (securityExpiryMs - Date.now() > 366 * 24 * 60 * 60 * 1000)
  throw new Error(
    'security.txt Expires must remain within one year of verification.',
  );

const wranglerText = await readFile(join(root, 'wrangler.jsonc'), 'utf8');
const wranglerParseErrors = [];
const wrangler = parseJsonc(wranglerText, wranglerParseErrors, {
  allowTrailingComma: true,
  disallowComments: false,
});
if (wranglerParseErrors.length > 0) {
  const details = wranglerParseErrors
    .map(
      ({ error, offset }) =>
        `${printParseErrorCode(error)} at character ${offset}`,
    )
    .join(', ');
  throw new Error(`wrangler.jsonc contains invalid JSONC: ${details}`);
}
if (wrangler.workers_dev !== false || wrangler.preview_urls !== false)
  throw new Error('Workers.dev and Preview URLs must stay disabled.');
if (
  wrangler.assets?.directory !== './dist' ||
  wrangler.assets?.not_found_handling !== '404-page' ||
  wrangler.assets?.html_handling !== 'drop-trailing-slash'
) {
  throw new Error('Cloudflare static-assets routing configuration drifted.');
}
if ('main' in wrangler)
  throw new Error(
    'Static website must not introduce a Worker application script without explicit review.',
  );

const workflowDir = join(root, '.github', 'workflows');
for (const workflowPath of await walk(workflowDir)) {
  const text = await readFile(workflowPath, 'utf8');
  if (/permissions:\s*write-all/i.test(text) || /contents:\s*write/i.test(text))
    throw new Error(
      `Verification workflow must remain read-only: ${relative(root, workflowPath)}`,
    );
  if (/wrangler\s+deploy|cloudflare\/wrangler-action/i.test(text))
    throw new Error(
      `Verification workflow must not deploy: ${relative(root, workflowPath)}`,
    );
  for (const match of text.matchAll(/uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
    const ref = match[1].split('@')[1];
    if (!ref || !/^[a-f0-9]{40}$/i.test(ref))
      throw new Error(
        `GitHub Action must be pinned to a full commit SHA: ${match[1]}`,
      );
  }
}

const contentLicense = await readFile(join(root, 'LICENSING.md'), 'utf8');
for (const required of [
  '## Visitor-facing textual content — CC BY-SA 4.0',
  '## Website source/software — Apache-2.0',
  '## Official Macro Evidence identity assets — separately governed',
  '## Third-party material',
]) {
  if (!contentLicense.includes(required))
    throw new Error(`Licensing boundary missing: ${required}`);
}
for (const mirrorLanguage of [
  'canonical-records/',
  '## Synchronized canonical records — CC BY-SA 4.0',
  'canonical-records/manifest.json',
]) {
  if (contentLicense.includes(mirrorLanguage)) {
    throw new Error(
      `Canonical-record mirror publication language is not permitted in LICENSING.md: ${mirrorLanguage}`,
    );
  }
}
const repositoryReadme = await readFile(join(root, 'README.md'), 'utf8');

for (const mirrorGuidance of [
  'npm run check:canonical-records',
  'npm run sync:canonical-records',
  'canonical-records/manifest.json',
]) {
  if (repositoryReadme.includes(mirrorGuidance)) {
    throw new Error(
      `Canonical-record mirror guidance is not permitted in README: ${mirrorGuidance}`,
    );
  }
}

for (const path of repoFiles) {
  const rel = relative(root, path).replaceAll('\\', '/');
  if (
    rel.startsWith('canonical-records/') ||
    /(?:CanonicalRecord\.astro|canonical-records(?:-sync)?\.mjs)$/i.test(rel) ||
    /(?:verify|check|sync)-canonical-records\.mjs$/i.test(rel)
  ) {
    throw new Error(
      `Canonical-record mirror artifact is not permitted: ${rel}`,
    );
  }
}

const textExtensions = new Set([
  '.md',
  '.astro',
  '.css',
  '.mjs',
  '.js',
  '.json',
  '.jsonc',
  '.txt',
  '.yml',
  '.yaml',
]);
const textBasenames = new Set(['_headers', 'robots.txt']);
const repositoryTextFiles = repoFiles.filter(
  (path) =>
    textExtensions.has(extname(path).toLowerCase()) ||
    textBasenames.has(basename(path)),
);
console.log(
  `Source constraints verified across ${repositoryTextFiles.length} repository text files.`,
);
