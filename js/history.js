/**
 * HistoryManager — manages chat conversations in localStorage.
 * Each conversation: { id, title, messages[], model, createdAt, updatedAt }
 * Each message:      { id, role, content, reasoning, model, modelLabel, timestamp }
 */
class HistoryManager {
  constructor() {
    this._key = 'nexus_history';
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this._key)) || [];
    } catch { return []; }
  }

  _save(list) {
    localStorage.setItem(this._key, JSON.stringify(list));
  }

  getAll() {
    return this._load().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getById(id) {
    return this._load().find(c => c.id === id) || null;
  }

  create(model = '') {
    const conv = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: 'New Conversation',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const list = this._load();
    list.unshift(conv);
    this._save(list);
    return conv;
  }

  update(id, patch) {
    const list = this._load();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
    this._save(list);
    return list[idx];
  }

  addMessage(convId, message) {
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      timestamp: Date.now(),
      ...message,
    };
    const conv = this.getById(convId);
    if (!conv) return null;

    const messages = [...conv.messages, msg];
    // Auto-title from first user message
    let title = conv.title;
    if (title === 'New Conversation' && message.role === 'user') {
      title = message.content.slice(0, 52) + (message.content.length > 52 ? '…' : '');
    }
    this.update(convId, { messages, title });
    return msg;
  }

  updateLastMessage(convId, patch) {
    const conv = this.getById(convId);
    if (!conv || !conv.messages.length) return;
    const messages = [...conv.messages];
    messages[messages.length - 1] = { ...messages[messages.length - 1], ...patch };
    this.update(convId, { messages });
  }

  delete(id) {
    const list = this._load().filter(c => c.id !== id);
    this._save(list);
  }

  search(query) {
    const q = query.toLowerCase();
    return this._load().filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.messages.some(m => m.content.toLowerCase().includes(q))
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  formatDate(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return new Date(ts).toLocaleDateString();
  }
}
