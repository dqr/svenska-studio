/**
 * translate.js — Anthropic Claude translation and vocabulary extraction
 */

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function claudeHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

async function claudeRequest(apiKey, prompt, maxTokens = 4000) {
  const res = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

/**
 * Translate an array of Whisper segments from Swedish to English.
 * Returns an array of translated strings, one per segment.
 *
 * @param {Array} segments - Whisper segment objects with .text
 * @param {string} apiKey - Anthropic API key
 * @param {function} onProgress - Optional status callback
 * @returns {Promise<Array<string>>}
 */
export async function translateSegments(segments, apiKey, onProgress) {
  onProgress?.('Translating to English…');

  const segTexts = segments.map((s, i) => `[${i}] ${s.text.trim()}`).join('\n');
  const prompt = `You are a professional Swedish-to-English translator. Translate each numbered segment below from Swedish to English.
Return ONLY a JSON array of strings — one translation per segment, in order, no extra text.

Segments:
${segTexts}`;

  const raw = await claudeRequest(apiKey, prompt, 4000);
  const translations = JSON.parse(raw.replace(/```json|```/g, '').trim());
  onProgress?.('Translation complete');
  return translations;
}

/**
 * Extract vocabulary items from a full Swedish transcript.
 *
 * @param {string} transcript - Full Swedish text
 * @param {string} apiKey - Anthropic API key
 * @param {function} onProgress - Optional status callback
 * @returns {Promise<Array<{sv, en, pos, example}>>}
 */
export async function extractVocab(transcript, apiKey, onProgress) {
  onProgress?.('Extracting vocabulary…');

  const prompt = `You are a Swedish language teacher. From this Swedish transcript, extract 10–15 interesting or useful vocabulary words/phrases for a learner.

For each item return a JSON object with:
- "sv": the Swedish word or phrase
- "en": English meaning
- "pos": part of speech (noun / verb / adjective / phrase / etc.)
- "example": short example sentence from the transcript or similar context (in Swedish)

Return ONLY a valid JSON array, no markdown, no preamble.

Transcript:
${transcript}`;

  const raw = await claudeRequest(apiKey, prompt, 2000);
  const items = JSON.parse(raw.replace(/```json|```/g, '').trim());
  onProgress?.(`${items.length} vocabulary items extracted`);
  return items;
}
