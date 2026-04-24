/**
 * GeminiProvider — Google Gemini API integration.
 * Uses the native Generative Language REST API (no SDK needed).
 * Supports streaming, thinking mode (Gemini 2.5), and free models.
 * Docs: https://ai.google.dev/api/generate-content
 */
class GeminiProvider {
  constructor(apiKey) {
    this.apiKey  = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.name    = 'Google Gemini';
  }

  // ── Available free Gemini models ──
  static get FREE_MODELS() {
    return [
      { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Thinking)', supportsThinking: true,  provider: 'Google Gemini' },
      { id: 'gemini-2.0-flash',               name: 'Gemini 2.0 Flash',             supportsThinking: false, provider: 'Google Gemini' },
      { id: 'gemini-2.0-flash-lite',           name: 'Gemini 2.0 Flash-Lite',        supportsThinking: false, provider: 'Google Gemini' },
      { id: 'gemini-1.5-flash',               name: 'Gemini 1.5 Flash',             supportsThinking: false, provider: 'Google Gemini' },
      { id: 'gemini-1.5-pro',                 name: 'Gemini 1.5 Pro',               supportsThinking: false, provider: 'Google Gemini' },
    ];
  }

  // ── Map effort level to Gemini thinking budget (tokens) ──
  _thinkingBudget(effort) {
    return { low: 512, medium: 4096, high: 16000 }[effort] || 4096;
  }

  // ── Convert OpenAI-style messages → Gemini contents format ──
  _convertMessages(messages) {
    const systemParts = [];
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push({ text: msg.content });
      } else {
        // Gemini uses 'model' instead of 'assistant'
        contents.push({
          role:  msg.role === 'assistant' ? 'model' : 'user',
          parts: Array.isArray(msg.content)
            ? msg.content.map(p => {
                if (p.type === 'text') return { text: p.text };
                if (p.type === 'image_url') {
                  const b64 = p.image_url.url.split(',')[1];
                  const mime = p.image_url.url.split(';')[0].split(':')[1];
                  return { inlineData: { mimeType: mime, data: b64 } };
                }
                return { text: '' };
              })
            : [{ text: msg.content }],
        });
      }
    }

    // Gemini requires alternating user/model turns — merge consecutive same-role messages
    const merged = [];
    for (const c of contents) {
      if (merged.length && merged[merged.length - 1].role === c.role) {
        merged[merged.length - 1].parts.push(...c.parts);
      } else {
        merged.push({ ...c, parts: [...c.parts] });
      }
    }

    return { systemParts, contents: merged };
  }

  // ── Async streaming generator ──
  async *stream(messages, options = {}) {
    const modelId = options.model || 'gemini-2.0-flash';
    const { systemParts, contents } = this._convertMessages(messages);

    const body = {
      contents,
      generationConfig: {
        temperature:      options.temperature ?? 0.7,
        maxOutputTokens:  options.maxTokens  ?? 2048,
      },
    };

    if (systemParts.length > 0) {
      body.systemInstruction = { parts: systemParts };
    }

    // Thinking mode — only for models that support it (Gemini 2.5+)
    const supportsThinking = modelId.includes('2.5') || modelId.includes('thinking');
    if (options.thinking && supportsThinking) {
      body.generationConfig.thinkingConfig = {
        thinkingBudget: this._thinkingBudget(options.effort),
      };
    }

    const url = `${this.baseURL}/models/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  options.signal,
    });

    if (!res.ok) {
      let errMsg = `Gemini API Error ${res.status}`;
      try {
        const err = await res.json();
        errMsg = err.error?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const raw = trimmed.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const parsed    = JSON.parse(raw);
          const candidate = parsed.candidates?.[0];
          if (!candidate) continue;

          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.thought) {
              // Reasoning / thinking token
              yield { content: '', reasoning: part.text || '' };
            } else if (part.text) {
              yield { content: part.text, reasoning: '' };
            }
          }
        } catch { /* skip malformed SSE chunk */ }
      }
    }
  }
}
