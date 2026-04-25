// Simple RAG without vector DB — uses keyword matching
// Good enough for study assistant use case

/**
 * Split text into overlapping chunks
 */
function chunkText(text, chunkSize = 500, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Simple keyword-based similarity score
 * Returns a score 0-1 based on word overlap
 */
function similarity(query, chunk) {
  const queryWords = new Set(
    query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );

  const chunkWords = new Set(
    chunk.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );

  if (queryWords.size === 0) return 0;

  let matches = 0;
  for (const word of queryWords) {
    if (chunkWords.has(word)) matches++;
  }

  return matches / queryWords.size;
}

/**
 * Find top-k most relevant chunks for a query
 */
function retrieveRelevantChunks(query, chunks, topK = 3) {
  const scored = chunks.map((chunk, index) => ({
    text: chunk.text,
    index,
    score: similarity(query, chunk.text)
  }));

  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => c.text);
}

/**
 * Build a context string from retrieved chunks
 */
function buildContext(relevantChunks, fileName) {
  if (relevantChunks.length === 0) return '';

  return `The following is relevant content from the document "${fileName}":\n\n` +
    relevantChunks.map((chunk, i) => `[Excerpt ${i + 1}]:\n${chunk}`).join('\n\n');
}

module.exports = { chunkText, retrieveRelevantChunks, buildContext };