/**
 * SettingsManager — persists all user settings to localStorage.
 */
class SettingsManager {
  constructor() {
    this._key = 'nexus_settings';
    this._defaults = {
      openrouterKey: '',
      geminiKey: '',
      huggingfaceKey: '',
      systemPrompt: 'You are a helpful, knowledgeable, and precise AI assistant.',
      temperature: 0.7,
      maxTokens: 2048,
      thinkingEnabled: false,
      effortLevel: 'medium',
      theme: 'dark',
      lastModel: '',
      lastConvId: '',
    };
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this._key)) || {};
    } catch { return {}; }
  }

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  }

  get(key) {
    const data = this._load();
    return key in data ? data[key] : this._defaults[key];
  }

  set(key, value) {
    const data = this._load();
    data[key] = value;
    this._save(data);
  }

  setMany(obj) {
    const data = this._load();
    Object.assign(data, obj);
    this._save(data);
  }

  getAll() {
    return { ...this._defaults, ...this._load() };
  }
}
