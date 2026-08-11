const fs = require('fs');

let content = fs.readFileSync('src/lib/memory/extraction.ts', 'utf8');

// Change 1: Fetch user's name and pass it to extraction
content = content.replace(
  '    const extracted = await runExtraction(userMessage, assistantMessage);',
  `    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const userName = user?.name?.split(' ')[0] || 'User';

    const extracted = await runExtraction(userMessage, assistantMessage, userName);`
);

// Change 2: Add userName parameter to runExtraction
content = content.replace(
  'async function runExtraction(userMsg: string, assistantMsg: string): Promise<ExtractionResult> {',
  `async function runExtraction(userMsg: string, assistantMsg: string, userName: string = 'User'): Promise<ExtractionResult> {`
);

// Change 3: Tell the LLM to use the actual name
content = content.replace(
  '- Only extract facts ABOUT THE USER (not the assistant).',
  `- Only extract facts ABOUT THE USER (not the assistant).
- The user's name is \${userName}. Use "\${userName}" instead of "the user" or "User" in every statement.`
);

// Change 4: Post-process any remaining "the user" / "User"
content = content.replace(
  `    const memories = parsed.memories
      .filter(m => m.statement && m.statement.length > 5)
      .map(m => ({
        statement: m.statement.trim(),`,
  `    const memories = parsed.memories
      .filter(m => m.statement && m.statement.length > 5)
      .map(m => {
        let statement = m.statement.trim()
          .replace(/\\bthe user\\b/gi, userName)
          .replace(/\\bUser\\b/g, userName);
        return {
          statement,`
);

fs.writeFileSync('src/lib/memory/extraction.ts', content);
console.log('Done');
