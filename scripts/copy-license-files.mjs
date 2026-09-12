import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distLicenses = join(root, 'dist', 'licenses');

const apacheSource = join(root, 'LICENSE');
const ccSource = join(root, 'LICENSE-CONTENT');
const apacheTarget = join(distLicenses, 'apache-2.0.txt');
const ccTarget = join(distLicenses, 'cc-by-sa-4.0.txt');

const packageRoot = join(root, 'node_modules', '@fontsource-variable', 'inter');
const packageManifestPath = join(packageRoot, 'package.json');
const metadataPath = join(packageRoot, 'metadata.json');
const interLicensePath = join(packageRoot, 'LICENSE');
const interLicenseTarget = join(distLicenses, 'inter-OFL-1.1.txt');
const interNoticeTarget = join(distLicenses, 'inter-NOTICE.txt');

const apacheLicense = await readFile(apacheSource, 'utf8');
if (
  !apacheLicense.includes('Apache License') ||
  !apacheLicense.includes('Version 2.0, January 2004')
) {
  throw new Error('Unexpected root Apache-2.0 license text.');
}

const ccLicense = await readFile(ccSource, 'utf8');
if (
  !ccLicense.includes('Attribution-ShareAlike 4.0 International') ||
  !ccLicense.includes('Creative Commons Corporation')
) {
  throw new Error('Unexpected root CC BY-SA 4.0 license text.');
}

const packageManifest = JSON.parse(await readFile(packageManifestPath, 'utf8'));
if (
  packageManifest.name !== '@fontsource-variable/inter' ||
  packageManifest.version !== '5.3.0' ||
  packageManifest.license !== 'OFL-1.1'
) {
  throw new Error(
    `Unexpected Inter package identity: ${packageManifest.name}@${packageManifest.version} (${packageManifest.license})`,
  );
}

const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const attribution = metadata?.license?.attribution;
if (
  metadata.id !== 'inter' ||
  metadata.family !== 'Inter' ||
  metadata?.license?.type !== 'OFL-1.1' ||
  typeof attribution !== 'string' ||
  !attribution.includes(
    'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)',
  )
) {
  throw new Error('Unexpected Inter package metadata or upstream attribution.');
}

const interLicense = await readFile(interLicensePath, 'utf8');
for (const required of [
  'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
  'Permission is hereby granted, free of charge, to any person obtaining',
]) {
  if (!interLicense.includes(required)) {
    throw new Error(`Unexpected Inter OFL text; missing: ${required}`);
  }
}

const interNotice = `Inter\n\nPackage: @fontsource-variable/inter@5.3.0\nUpstream attribution (verbatim from package metadata):\n${attribution}\n\nLicense: SIL Open Font License 1.1 (OFL-1.1)\nSee inter-OFL-1.1.txt in this directory for the exact bundled license text.\n`;

await mkdir(distLicenses, { recursive: true });
await copyFile(apacheSource, apacheTarget);
await copyFile(ccSource, ccTarget);
await copyFile(interLicensePath, interLicenseTarget);
await writeFile(interNoticeTarget, interNotice, 'utf8');
console.log(
  'Copied website license texts and exact-pinned Inter licensing material into built output.',
);
