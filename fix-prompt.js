const fs = require('fs');
let content = fs.readFileSync('src/lib/memory/extraction.ts', 'utf8');

// Replace the runExtraction prompt with one that has explicit examples
const oldPrompt = `Rules:
- Only extract facts ABOUT THE USER (not the assistant).
- The user's name is \${userName}. Use "\${userName}" instead of "the user" or "User" in every statement.
- Be concise. One sentence per memory.
- Include the company name, person name, or specific location in EVERY statement.
- Include the date or time reference in EVERY statement (e.g., "tomorrow", "Friday", "next week").
- NEVER extract vague statements like "User has an interview" — always specify who, where, and when.
- If the user mentions the same fact twice with slightly different wording, extract it ONCE.
- If nothing worth extracting, return {"memories": []}.`;

const newPrompt = `Rules:
- Only extract facts ABOUT THE USER (not the assistant).
- The user's name is \${userName}. Use "\${userName}" instead of "the user" or "User" in every statement.
- Transform casual statements into underlying facts. DO NOT quote the user's exact words as the memory.
- Be concise. One sentence per memory.

Examples of correct transformations:
  User says: "my sister is calling me" → Extract: {"statement": "\${userName} has a sister", "category": "RELATIONSHIPS"}
  User says: "she bought a dog called rex today" → Extract: {"statement": "\${userName} bought a dog named Rex", "category": "PREFERENCES"}
  User says: "I have an interview at Google tomorrow" → Extract: {"statement": "\${userName} has an interview at Google tomorrow", "category": "CAREER", "temporalMarker": "tomorrow"}
  User says: "I live in Nairobi" → Extract: {"statement": "\${userName} lives in Nairobi", "category": "IDENTITY"}
  User says: "I'm feeling stressed about work" → Extract: {"statement": "\${userName} feels stressed about work", "category": "EMOTIONS"}

- Include the company name, person name, or specific location in EVERY statement.
- Include the date or time reference in EVERY statement when mentioned (e.g., "tomorrow", "Friday", "next week").
- NEVER extract vague statements like "\${userName} has an interview" — always specify who, where, and when.
- If the user mentions the same fact twice with slightly different wording, extract it ONCE.
- If nothing worth extracting, return {"memories": []}.`;

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync('src/lib/memory/extraction.ts', content);
console.log('Done');
