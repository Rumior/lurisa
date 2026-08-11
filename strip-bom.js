const fs = require('fs'); let c = fs.readFileSync('package.json', 'utf8'); if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1); fs.writeFileSync('package.json', c, 'utf8'); console.log('done');
