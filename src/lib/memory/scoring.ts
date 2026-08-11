export function scoreMemory(extracted: any): { confidence: number; importance: number } {
  let confidence = extracted.confidence;
  let importance = extracted.importance;

  // Penalize inferred/uncertain statements heavily
  const uncertainPhrases = ['thinking about', 'considering', 'might', 'maybe', 'possibly', 'wondering', 'interested in', 'wants to', 'hoping to', 'interview for'];
  const statementLower = extracted.statement.toLowerCase();
  
  if (uncertainPhrases.some(p => statementLower.includes(p))) {
    confidence = Math.max(0, confidence - 0.15);
    importance = Math.max(0, importance - 0.1);
  }

  // Interviews and appointments are always temporary, lower importance
  if (statementLower.includes('interview') || statementLower.includes('appointment') || statementLower.includes('meeting')) {
    importance = Math.min(importance, 0.6); // Cap importance for events
  }

  // Explicit facts get a small boost
  const explicitMarkers = ['my name is', 'i am', 'i have', 'i work at', 'i live in'];
  if (explicitMarkers.some(m => statementLower.includes(m))) {
    confidence = Math.min(1, confidence + 0.05);
  }

  return {
    confidence: Math.round(confidence * 100) / 100,
    importance: Math.round(importance * 100) / 100,
  };
}