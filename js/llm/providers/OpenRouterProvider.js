/**
 * OpenRouterProvider — connects to OpenRouter's OpenAI-compatible API.
 * Supports streaming, thinking/reasoning mode, and free model fetching.
 * Docs: https://openrouter.ai/docs
 */
class OpenRouterProvider {
  constructor(apiKey) {
    this.apiKey  = apiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.name    = 'OpenRouter';
  }

  // ── Fetch available free models ──
  async getModels() {
    const res = await fetch(`${this.baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
    const data = await res.json();

    // Filter models where both prompt and completion pricing is $0
    const free = (data.data || []).filter(m => {
      const p = parseFloat(m.pricing?.prompt  || '1');
      const c = parseFloat(m.pricing?.completion || '1');
      return p === 0 && c === 0;
    });

    return free.map(m => ({
      id:            m.id,
      name:          m.name || m.id,
      contextLength: m.context_length || null,
      supportsThinking: !!(m.id.includes('r1') || m.id.includes('thinking') || m.id.includes('o1') || m.id.includes('o3')),
    }));
  }

  // ── Streaming chat completion (async generator) ──
  async *stream(messages, options = {}) {
    const body = {
      model:       options.model || 'meta-llama/llama-3.3-70b-instruct:free',
      messages,
      stream:      true,
      temperature: options.temperature ?? 0.7,
      max_tokens:  options.maxTokens  ?? 2048,
    };

    // Attach reasoning params for models that support thinking
    if (options.thinking) {
      const effortMap = { low: 'low', medium: 'medium', high: 'high' };
      body.reasoning = { effort: effortMap[options.effort] || 'medium' };
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  window.location.href,
        'X-Title':       'NEXUS Chat',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!res.ok) {
      let errMsg = `API Error ${res.status}`;
      try {
        const err = await res.json();
        errMsg = err.error?.message || err.message || errMsg;
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
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const raw = trimmed.slice(6);
        if (raw === '[DONE]') return;

        try {
          const parsed  = JSON.parse(raw);
          const delta   = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          yield {
            content:   delta.content   || '',
            reasoning: delta.reasoning || '',
          };
        } catch { /* skip malformed chunk */ }
      }
    }
  }

  // ── Fallback free model list (shown before API key is saved) ──
  static get DEFAULT_FREE_MODELS() {
    return [
      { id: 'meta-llama/llama-3.3-70b-instruct:free',        name: 'Llama 3.3 70B',        supportsThinking: false },
      { id: 'google/gemma-3-27b-it:free',                     name: 'Gemma 3 27B',           supportsThinking: false },
      { id: 'mistralai/mistral-7b-instruct:free',             name: 'Mistral 7B Instruct',   supportsThinking: false },
      { id: 'deepseek/deepseek-r1:free',                       name: 'DeepSeek R1 (Thinking)',supportsThinking: true  },
      { id: 'qwen/qwen-2.5-72b-instruct:free',                name: 'Qwen 2.5 72B',          supportsThinking: false },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',    name: 'Nemotron 70B',          supportsThinking: false },
      { id: 'meta-llama/llama-3.1-8b-instruct:free',          name: 'Llama 3.1 8B (Fast)',   supportsThinking: false },
      { id: 'openchat/openchat-7b:free',                       name: 'OpenChat 7B',           supportsThinking: false },
    ];
  }
}
