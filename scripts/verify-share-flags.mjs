import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagesRoot = join(process.cwd(), 'src/pages');
const sourcePages = [
  'home',
  'list',
  'medicines',
  'checkups',
  'profile'
];

const failures = [];
const truthy = String.raw`(?:true|!0)`;
const commonDistPath = join(process.cwd(), 'dist/common.js');
const commonDist = existsSync(commonDistPath)
  ? readFileSync(commonDistPath, 'utf8')
  : '';

function hasDirectFlag(dist, flag) {
  return new RegExp(String.raw`\w+\.${flag}\s*=\s*${truthy}`).test(dist);
}

function hasPageShareHelper(dist, flag) {
  return (
    /\bwithPageShare\s*\(/.test(dist) &&
    new RegExp(String.raw`\w+\.${flag}\s*=\s*${truthy}`).test(commonDist)
  );
}

for (const page of sourcePages) {
  const configPath = join(pagesRoot, page, 'index.config.ts');
  const sourcePath = join(pagesRoot, page, 'index.tsx');
  const distPath = join(process.cwd(), 'dist/pages', page, 'index.js');

  if (!existsSync(configPath) || !existsSync(sourcePath)) {
    continue;
  }

  const config = readFileSync(configPath, 'utf8');
  const wantsAppMessage = /enableShareAppMessage\s*:\s*true/.test(config);
  const wantsTimeline = /enableShareTimeline\s*:\s*true/.test(config);

  if (!wantsAppMessage && !wantsTimeline) {
    continue;
  }

  if (!existsSync(distPath)) {
    failures.push(`${page}: missing ${distPath}`);
    continue;
  }

  const dist = readFileSync(distPath, 'utf8');

  if (
    wantsAppMessage &&
    !hasDirectFlag(dist, 'enableShareAppMessage') &&
    !hasPageShareHelper(dist, 'enableShareAppMessage')
  ) {
    failures.push(`${page}: missing component.enableShareAppMessage = true`);
  }

  if (
    wantsTimeline &&
    !hasDirectFlag(dist, 'enableShareTimeline') &&
    !hasPageShareHelper(dist, 'enableShareTimeline')
  ) {
    failures.push(`${page}: missing component.enableShareTimeline = true`);
  }
}

if (failures.length) {
  console.error('Share lifecycle flags are missing from built pages:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Share lifecycle flags are present in built pages.');
