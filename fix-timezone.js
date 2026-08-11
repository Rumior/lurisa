const fs = require('fs');
let content = fs.readFileSync('src/lib/memory/extraction.ts', 'utf8');

content = content.replace(
  'morningOf.setHours(8, 0, 0, 0);',
  'morningOf.setHours(5, 0, 0, 0); // 5 AM UTC = 8 AM EAT (+03:00)'
);

fs.writeFileSync('src/lib/memory/extraction.ts', content);
console.log('Fixed timezone');
