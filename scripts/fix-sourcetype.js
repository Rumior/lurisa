const fs = require('fs');

// 1. types.ts — SourceMetadata strict, RawArticle loose
let types = fs.readFileSync('src/lib/global-updates/types.ts', 'utf8');
types = types.replace("sourceType: 'PRIMARY' | 'SECONDARY' | 'RESEARCH';", "sourceType: SourceType;");
types = types.replace("sourceType: 'PRIMARY' | 'SECONDARY' | 'RESEARCH';", "sourceType: string;");
fs.writeFileSync('src/lib/global-updates/types.ts', types);
console.log('types.ts done');

// 2. discovery.ts — add SourceType import, fix comparison
let disc = fs.readFileSync('src/lib/global-updates/discovery.ts', 'utf8');
if (!disc.includes('SourceType')) {
  disc = disc.replace("import { RawArticle } from './types';", "import { RawArticle } from './types';\nimport { SourceType } from '@prisma/client';");
}
disc = disc.replace(
  "sourceType: (article.sourceType === 'RESEARCH' ? 'TERTIARY' : article.sourceType) as SourceType,",
  "sourceType: (article.sourceType === 'RESEARCH' ? 'TERTIARY' : article.sourceType) as SourceType,"
);
fs.writeFileSync('src/lib/global-updates/discovery.ts', disc);
console.log('discovery.ts done');

// 3. worker.ts — add SourceType import
let worker = fs.readFileSync('src/workers/global-updates-worker.ts', 'utf8');
if (!worker.includes('SourceType')) {
  const lines = worker.split('\n');
  const idx = lines.findIndex(l => l.trim().startsWith('import '));
  lines.splice(idx, 0, "import { SourceType } from '@prisma/client';");
  worker = lines.join('\n');
}
fs.writeFileSync('src/workers/global-updates-worker.ts', worker);
console.log('worker.ts done');