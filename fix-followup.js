const fs = require('fs');
let content = fs.readFileSync('src/lib/follow-up.ts', 'utf8');

content = content.replace(
  `function buildNotificationBody(intent: any): string {
  const stmt = intent.memories?.statement || 'something important';
    case 'MORNING_ENCOURAGEMENT':`,
  `function buildNotificationBody(intent: any): string {
  const stmt = intent.memories?.statement || 'something important';
  switch (intent.actionType) {
    case 'MORNING_ENCOURAGEMENT':`
);

content = content.replace(
  `    default: return stmt;
  }
}`,
  `    default: return stmt;
  }
}`
);

fs.writeFileSync('src/lib/follow-up.ts', content);
console.log('Fixed buildNotificationBody');
