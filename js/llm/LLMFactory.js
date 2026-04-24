/**
 * LLMFactory — routes requests to the correct provider based on model ID.
 * Gemini models (gemini-*) → GeminiProvider
 * Everything else          → OpenRouterProvider
 */
class LLMFactory {
  constructor(settings) {
    this.settings = settings;
    this._providers = {};
  }

  // ── Pick provider based on model ID ──
  _getProvider(modelId = '') {
    const isGemini = modelId.startsWith('gemini-') || modelId.startsWith('gemma-');
    const isHF = modelId.startsWith('hf-');

    if (isGemini) {
      const key = this.settings.get('geminiKey');
      if (!key) throw new Error('No Gemini API key set. Add it in ⚙ Settings.');
      if (!this._providers.gemini || this._providers.gemini.apiKey !== key) {
        this._providers.gemini = new GeminiProvider(key);
      }
      return this._providers.gemini;
    }

    if (isHF) {
      const key = this.settings.get('huggingfaceKey');
      if (!key) throw new Error('No Hugging Face token set. Add it in ⚙ Settings.');
      if (!this._providers.huggingface || this._providers.huggingface.apiKey !== key) {
        this._providers.huggingface = new HuggingFaceProvider(key);
      }
      return this._providers.huggingface;
    }

    // Default: OpenRouter
    const key = this.settings.get('openrouterKey');
    if (!key) throw new Error('No OpenRouter key set. Add it in ⚙ Settings → API Configuration.');
    if (!this._providers.openrouter || this._providers.openrouter.apiKey !== key) {
      this._providers.openrouter = new OpenRouterProvider(key);
    }
    return this._providers.openrouter;
  }

  hasKey() {
    return !!(this.settings.get('openrouterKey') || this.settings.get('geminiKey') || this.settings.get('huggingfaceKey'));
  }

  // ── Return combined model list grouped by provider ──
  async getModels() {
    const models = [];

    // Gemini models (always available if key set)
    const geminiKey = this.settings.get('geminiKey');
    if (geminiKey) {
      GeminiProvider.FREE_MODELS.forEach(m => models.push(m));
    }

    // Hugging Face models (always available if key set)
    const hfKey = this.settings.get('huggingfaceKey');
    if (hfKey) {
      HuggingFaceProvider.FREE_MODELS.forEach(m => models.push(m));
    }

    // OpenRouter models
    const orKey = this.settings.get('openrouterKey');
    if (orKey) {
      try {
        const live = await new OpenRouterProvider(orKey).getModels();
        live.forEach(m => models.push({ ...m, provider: 'OpenRouter' }));
      } catch {
        OpenRouterProvider.DEFAULT_FREE_MODELS.forEach(m => models.push({ ...m, provider: 'OpenRouter' }));
      }
    } else {
      // Show OpenRouter defaults even without a key so the picker is useful
      OpenRouterProvider.DEFAULT_FREE_MODELS.forEach(m => models.push({ ...m, provider: 'OpenRouter' }));
    }

    return models;
  }

  /**
   * Async generator yielding { content, reasoning } chunks.
   * options: { model, temperature, maxTokens, thinking, effort, signal }
   */
  async *stream(messages, options = {}) {
    const provider = this._getProvider(options.model);
    const merged = {
      temperature: this.settings.get('temperature'),
      maxTokens: this.settings.get('maxTokens'),
      thinking: this.settings.get('thinkingEnabled'),
      effort: this.settings.get('effortLevel'),
      ...options,
    };
    yield* provider.stream(messages, merged);
  }
}
