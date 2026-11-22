import { timingSafeEqual } from 'node:crypto';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(statusCode, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export default async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod === 'GET') {
    return json(200, { ok: true, service: 'SYVORA AI on Netlify' });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const apiKey = process.env.GEMINI_API_KEY;
  const accessCode = process.env.SYVORA_ACCESS_CODE;
  if (!apiKey || !accessCode) {
    return json(503, { error: 'SYVORA is not configured yet. The site owner must add its private Netlify environment variables and redeploy.' });
  }

  const authorization = event.headers?.authorization || event.headers?.Authorization || '';
  const supplied = authorization.replace(/^Bearer\s+/i, '');
  if (!supplied || !safeEqual(supplied, accessCode)) {
    return json(401, { error: 'Incorrect SYVORA access code.' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    if (!Array.isArray(payload.contents) || payload.contents.length === 0) {
      return json(400, { error: 'A chat message is required.' });
    }
    const safeContents = payload.contents.slice(-12).map(item => ({
      role: item?.role === 'model' ? 'model' : 'user',
      parts: Array.isArray(item?.parts)
        ? item.parts.slice(0, 4).map(part => ({ text: String(part?.text || '').slice(0, 12000) }))
        : []
    }));
    const body = {
      contents: safeContents,
      generationConfig: {
        temperature: Math.min(1, Math.max(0, Number(payload.generationConfig?.temperature ?? 0.55))),
        maxOutputTokens: Math.min(1400, Math.max(50, Number(payload.generationConfig?.maxOutputTokens ?? 1000)))
      }
    };
    if (payload.systemInstruction?.parts?.length) {
      body.systemInstruction = {
        parts: payload.systemInstruction.parts.slice(0, 2).map(part => ({ text: String(part?.text || '').slice(0, 10000) }))
      };
    }

    let lastMessage = 'Gemini request failed.';
    for (const model of MODELS) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
        if (text.trim()) return json(200, { text: text.trim() });
        lastMessage = 'Gemini returned an empty response.';
      } else {
        lastMessage = data?.error?.message || `Gemini returned ${response.status}.`;
        if (response.status !== 404 && !/not found|not supported|invalid model/i.test(lastMessage)) break;
      }
    }
    return json(502, { error: lastMessage.slice(0, 240) });
  } catch (error) {
    console.error('SYVORA function error:', error?.message || error);
    const message = error?.name === 'TimeoutError'
      ? 'Gemini took too long to respond. Please try again.'
      : 'The SYVORA server could not complete that request.';
    return json(500, { error: message });
  }
}
