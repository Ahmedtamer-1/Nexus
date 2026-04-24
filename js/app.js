/**
 * NexusApp — main orchestrator. Wires together all modules and handles all UI interactions.
 */
class NexusApp {
  constructor() {
    this.settings  = new SettingsManager();
    this.history   = new HistoryManager();
    this.renderer  = new MarkdownRenderer();
    this.speech    = new SpeechManager();
    this.exporter  = new ExporterManager();
    this.llm       = new LLMFactory(this.settings);

    this.editor           = null; // init after DOM ready
    this.currentConvId    = null;
    this.isStreaming       = false;
    this.abortController   = null;
    this.lastUserMessage   = '';
    this.models            = [];
    this.editorOpen        = false;
    this.sidebarCollapsed  = false;

    this._init();
  }

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════
  _init() {
    this.editor = new EditorManager(this.renderer);
    this._applyTheme(this.settings.get('theme'));
    this._bindEvents();
    this._renderConvList();
    this._loadModels();
    // Restore last open conversation
    const lastId = this.settings.get('lastConvId');
    if (lastId && this.history.getById(lastId)) {
      this._loadConversation(lastId);
    }
  }

  // ══════════════════════════════════════════
  //  THEME
  // ══════════════════════════════════════════
  _applyTheme(theme) {
    document.getElementById('app').setAttribute('data-theme', theme);
    // Swap hljs stylesheet
    const hlLink = document.getElementById('hljs-theme');
    if (hlLink) {
      hlLink.href = theme === 'light'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
        : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    }
    const moon = document.getElementById('icon-moon');
    const sun  = document.getElementById('icon-sun');
    const lbl  = document.getElementById('theme-label');
    if (theme === 'light') {
      moon.style.display = 'none'; sun.style.display = '';
      lbl.textContent = 'Dark Mode';
    } else {
      moon.style.display = ''; sun.style.display = 'none';
      lbl.textContent = 'Light Mode';
    }
  }

  _toggleTheme() {
    const next = this.settings.get('theme') === 'dark' ? 'light' : 'dark';
    this.settings.set('theme', next);
    this._applyTheme(next);
  }

  // ══════════════════════════════════════════
  //  MODEL LOADING
  // ══════════════════════════════════════════
  async _loadModels() {
    const sel = document.getElementById('model-select');
    const badge = document.getElementById('model-badge');

    // Always populate with defaults first
    this.models = OpenRouterProvider.DEFAULT_FREE_MODELS;
    this._populateModelSelect(this.models);

    // If we have a key, fetch live list
    if (this.llm.hasKey()) {
      sel.disabled = true;
      try {
        const live = await this.llm.getModels();
        if (live.length > 0) {
          this.models = live;
          this._populateModelSelect(live);
        }
      } catch (e) {
        this._toast('Could not fetch live models — using defaults');
      } finally {
        sel.disabled = false;
      }
    }

    // Restore last selected model
    const last = this.settings.get('lastModel');
    if (last) sel.value = last;
    badge.style.display = '';
  }

  _populateModelSelect(models) {
    const dropdown = document.getElementById('model-dropdown');
    const hiddenSel = document.getElementById('model-select');
    const current = hiddenSel.value || this.settings.get('lastModel') || '';
    dropdown.innerHTML = '';
    hiddenSel.innerHTML = '';

    // Group by provider
    const groups = {};
    models.forEach(m => {
      const prov = m.provider || 'OpenRouter';
      if (!groups[prov]) groups[prov] = [];
      groups[prov].push(m);
    });

    let firstId = '';
    Object.entries(groups).forEach(([provider, provModels]) => {
      const lbl = document.createElement('div');
      lbl.className = 'cs-group-label';
      lbl.textContent = provider;
      dropdown.appendChild(lbl);

      provModels.forEach(m => {
        if (!firstId) firstId = m.id;
        // Hidden select option (for value tracking)
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.name;
        hiddenSel.appendChild(opt);

        // Custom option row
        const row = document.createElement('div');
        row.className = 'cs-option';
        row.dataset.value = m.id;
        row.dataset.name = m.name;
        row.dataset.thinking = m.supportsThinking ? '1' : '0';
        row.innerHTML = `
          <span class="cs-check">${m.id === current ? '✓' : ''}</span>
          <span class="cs-name">${m.name}</span>
          ${m.supportsThinking ? '<span class="cs-thinking-tag">Thinking</span>' : ''}`;

        if (m.id === current) row.classList.add('selected');

        row.addEventListener('click', () => this._selectModel(m.id, m.name, m.supportsThinking));
        dropdown.appendChild(row);
      });
    });

    // Select first if current not in list
    const target = current && hiddenSel.querySelector(`option[value="${current}"]`) ? current : firstId;
    if (target) this._selectModel(target,
      models.find(m => m.id === target)?.name || target,
      models.find(m => m.id === target)?.supportsThinking || false,
      false /* don't close dropdown */);
  }

  _selectModel(id, name, supportsThinking, closeDropdown = true) {
    // Update hidden select
    const hiddenSel = document.getElementById('model-select');
    hiddenSel.value = id;

    // Update trigger label
    document.getElementById('model-display-text').textContent = name + (supportsThinking ? ' ✦' : '');

    // Update checkmarks
    document.querySelectorAll('.cs-option').forEach(row => {
      const isSel = row.dataset.value === id;
      row.classList.toggle('selected', isSel);
      row.querySelector('.cs-check').textContent = isSel ? '✓' : '';
    });

    this.settings.set('lastModel', id);
    if (this.currentConvId) this.history.update(this.currentConvId, { model: id });
    if (closeDropdown) this._closeDropdown();
  }

  _openDropdown() {
    const trigger  = document.getElementById('model-trigger');
    const dropdown = document.getElementById('model-dropdown');
    trigger.classList.add('open');
    dropdown.classList.add('open');
  }

  _closeDropdown() {
    document.getElementById('model-trigger')?.classList.remove('open');
    document.getElementById('model-dropdown')?.classList.remove('open');
  }

  _currentModel() {
    const id = document.getElementById('model-select').value;
    const name = document.getElementById('model-display-text').textContent.replace(' ✦','');
    const thinking = document.querySelector(`.cs-option[data-value="${id}"]`)?.dataset?.thinking === '1';
    return { id, name, supportsThinking: thinking };
  }

  // ══════════════════════════════════════════
  //  CONVERSATION LIST
  // ══════════════════════════════════════════
  _renderConvList(query = '') {
    const list = document.getElementById('conversation-list');
    const convs = query ? this.history.search(query) : this.history.getAll();
    list.innerHTML = '';

    if (convs.length === 0) {
      list.innerHTML = `<div class="conv-empty">${query ? 'No results' : 'No conversations yet'}</div>`;
      return;
    }

    convs.forEach(c => {
      const div = document.createElement('div');
      div.className = 'conv-item' + (c.id === this.currentConvId ? ' active' : '');
      div.dataset.id = c.id;

      // Get a preview from the last message
      const lastMsg = c.messages[c.messages.length - 1];
      const preview = lastMsg
        ? lastMsg.content.replace(/```[\s\S]*?```/g, '[code]').replace(/[#*_`~>]/g, '').trim().slice(0, 60)
        : '';
      const msgCount = c.messages.length;

      div.innerHTML = `
        <div class="conv-icon">◈</div>
        <div class="conv-info">
          <div class="conv-title">${this._escHtml(c.title)}</div>
          ${preview ? `<div class="conv-preview">${this._escHtml(preview)}${preview.length >= 60 ? '…' : ''}</div>` : ''}
          <div class="conv-date">${this.history.formatDate(c.updatedAt)}${msgCount ? ` · ${msgCount} msg${msgCount === 1 ? '' : 's'}` : ''}</div>
        </div>
        <button class="conv-delete-btn" data-id="${c.id}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`;
      div.addEventListener('click', (e) => {
        if (e.target.closest('.conv-delete-btn')) return;
        this._loadConversation(c.id);
      });
      div.querySelector('.conv-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteConversation(c.id);
      });
      list.appendChild(div);
    });
  }

  _loadConversation(id) {
    if (this.isStreaming) return;
    const conv = this.history.getById(id);
    if (!conv) return;
    this.currentConvId = id;
    this.settings.set('lastConvId', id);
    this._renderConvList();
    this._renderMessages(conv.messages);
    this._updateEditBtn();
    // Restore model
    const sel = document.getElementById('model-select');
    if (conv.model && sel.querySelector(`option[value="${conv.model}"]`)) {
      sel.value = conv.model;
    }
  }

  _deleteConversation(id) {
    this.history.delete(id);
    if (this.currentConvId === id) {
      this.currentConvId = null;
      this.settings.set('lastConvId', '');
      this._clearMessages();
      this._updateEditBtn();
    }
    this._renderConvList();
    this._toast('Conversation deleted');
  }

  _newConversation() {
    if (this.isStreaming) return;
    this.currentConvId = null;
    this.settings.set('lastConvId', '');
    this._clearMessages();
    this._updateEditBtn();
    this._renderConvList();
  }

  // ══════════════════════════════════════════
  //  MESSAGE RENDERING
  // ══════════════════════════════════════════
  _clearMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = document.getElementById('welcome-screen')?.outerHTML || '';
    // Re-attach welcome card listeners
    container.querySelectorAll('.wl-card').forEach(card => {
      card.addEventListener('click', () => {
        document.getElementById('message-input').value = card.dataset.prompt;
        this._sendMessage();
      });
    });
    document.getElementById('welcome-screen')?.classList.remove('hidden');
  }

  _hideWelcome() {
    const ws = document.getElementById('welcome-screen');
    if (ws) ws.classList.add('hidden');
  }

  _renderMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    if (!messages.length) {
      const ws = document.createElement('div');
      ws.id = 'welcome-screen';
      ws.className = 'welcome-screen'; // will be re-added with original content — skip for loaded convs
      container.appendChild(ws);
      return;
    }
    messages.forEach(msg => this._appendMessageBubble(msg));
    this._scrollToBottom();
  }

  _appendMessageBubble(msg) {
    const container = document.getElementById('messages-container');
    this._hideWelcome();

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.role} msg-enter`;
    wrapper.dataset.msgId = msg.id || '';

    let actionsHtml = '';
    if (msg.role === 'user') {
      actionsHtml = `
        <div class="msg-actions">
          <button class="msg-action-btn redo-btn" title="Redo prompt">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.39"/></svg>
            Redo
          </button>
          <button class="msg-action-btn copy-btn" title="Copy">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
          <button class="msg-action-btn speak-btn" title="Read aloud">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            Speak
          </button>
        </div>`;
    } else {
      actionsHtml = `
        <div class="msg-actions">
          <button class="msg-action-btn speak-btn" title="Read aloud">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            Speak
          </button>
          <button class="msg-action-btn copy-btn" title="Copy text">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
          <button class="msg-action-btn editor-push-btn" title="Push to Editor">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            → Editor
          </button>
        </div>`;
    }

    const thinkingHtml = (msg.reasoning) ? `
      <div class="thinking-block">
        <div class="thinking-hdr" onclick="this.parentElement.classList.toggle('open'); this.parentElement.querySelector('.thinking-body').classList.toggle('open')">
          <div class="thinking-dots">
            <span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>
          </div>
          <span>Thinking</span>
          <svg class="thinking-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="thinking-body">${this._escHtml(msg.reasoning)}</div>
      </div>` : '';

    // Determine provider label for model tag
    const isGemini = msg.model && msg.model.startsWith('gemini-');
    const providerLabel = isGemini ? 'Google Gemini Free' : 'OpenRouter Free';
    const modelTag = msg.role === 'assistant'
      ? `<div class="msg-model-tag">${this._escHtml(msg.modelLabel || 'Assistant')} · ${providerLabel}</div>`
      : '';

    const contentHtml = msg.role === 'assistant'
      ? `<div class="msg-content markdown-body">${this.renderer.render(msg.content)}</div>`
      : `<div class="msg-content">${this._escHtml(msg.content)}</div>`;

    wrapper.innerHTML = `
      <div class="msg-avatar ${msg.role === 'assistant' ? 'ai-avatar' : ''}">${msg.role === 'user' ? 'You' : '◈'}</div>
      <div class="msg-body">
        ${modelTag}
        ${thinkingHtml}
        ${contentHtml}
        ${actionsHtml}
      </div>`;

    // Bind actions
    wrapper.querySelector('.copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
      this._toast('Copied!');
    });
    wrapper.querySelector('.speak-btn')?.addEventListener('click', (e) => {
      this.speech.toggleSpeak(msg.content, e.currentTarget);
    });
    wrapper.querySelector('.redo-btn')?.addEventListener('click', () => {
      this._redoPrompt(msg.content);
    });
    wrapper.querySelector('.editor-push-btn')?.addEventListener('click', () => {
      this._pushToEditor(msg.content);
    });

    container.appendChild(wrapper);
    return wrapper;
  }

  // Live-updating AI bubble during streaming
  _createStreamingBubble(modelName) {
    const container = document.getElementById('messages-container');
    this._hideWelcome();

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper assistant msg-enter';
    wrapper.id = 'streaming-bubble';
    wrapper.innerHTML = `
      <div class="msg-avatar ai-avatar">◈</div>
      <div class="msg-body">
        <div class="msg-model-tag">${this._escHtml(modelName)} · OpenRouter Free</div>
        <div class="thinking-block" id="stream-thinking" style="display:none">
          <div class="thinking-hdr" onclick="this.parentElement.classList.toggle('open'); this.parentElement.querySelector('.thinking-body').classList.toggle('open')">
            <div class="thinking-dots">
              <span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>
            </div>
            <span>Thinking…</span>
            <svg class="thinking-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="thinking-body open" id="stream-reasoning"></div>
        </div>
        <div class="msg-content markdown-body" id="stream-content">
          <div class="loading-dots"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
        </div>
      </div>`;

    container.appendChild(wrapper);
    this._scrollToBottom();
    return wrapper;
  }

  // ══════════════════════════════════════════
  //  SEND MESSAGE
  // ══════════════════════════════════════════
  async _sendMessage(overrideText) {
    const input = document.getElementById('message-input');
    let text  = (overrideText || input.value).trim();
    const hasImage = !!this.stagedImageBase64;
    
    if ((!text && !hasImage) || this.isStreaming) return;

    if (!this.llm.hasKey()) {
      this._toast('⚙ Please add your OpenRouter API key in Settings first');
      this._openSettings();
      return;
    }

    const model = this._currentModel();
    this.settings.set('lastModel', model.id);

    // Create conversation if needed
    if (!this.currentConvId) {
      const conv = this.history.create(model.id);
      this.currentConvId = conv.id;
      this.settings.set('lastConvId', conv.id);
    }

    // Embed staggered image into text content invisibly via markdown
    if (hasImage) {
      // Wait, we still need descriptive text even if blank.
      if (!text) text = "What is in this image?";
      text += `\n\n![Attached Image](${this.stagedImageBase64})`;
      this._removeAttachedImage();
    }

    // Save & show user message
    this.lastUserMessage = text;
    input.value = '';
    this._autoResizeInput();
    const userMsg = this.history.addMessage(this.currentConvId, { role: 'user', content: text });
    this._appendMessageBubble({ ...userMsg, role: 'user' });
    this._renderConvList();

    // Build messages array with system prompt
    const conv     = this.history.getById(this.currentConvId);
    const sysPrompt = this.settings.get('systemPrompt');
    const apiMessages = [
      ...(sysPrompt ? [{ role: 'system', content: sysPrompt }] : []),
      ...conv.messages.filter(m => m.role !== 'system').map(m => {
        let content = m.content;
        
        // Extract embedded markdown base64 images to standard vision array block
        const imgRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+)\)/g;
        if (imgRegex.test(content)) {
            const parts = [];
            let lastIdx = 0;
            imgRegex.lastIndex = 0; // reset
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
              const textBefore = content.substring(lastIdx, match.index).trim();
              if (textBefore) parts.push({ type: 'text', text: textBefore });
              parts.push({ type: 'image_url', image_url: { url: match[1] } });
              lastIdx = imgRegex.lastIndex;
            }
            const textAfter = content.substring(lastIdx).trim();
            if (textAfter) parts.push({ type: 'text', text: textAfter });
            content = parts;
        }
        
        return { role: m.role, content };
      }),
    ];

    // Start streaming
    this.isStreaming = true;
    this.abortController = new AbortController();
    document.getElementById('send-btn').disabled = true;

    const bubble = this._createStreamingBubble(model.name);
    const streamContent   = document.getElementById('stream-content');
    const streamReasoning = document.getElementById('stream-reasoning');
    const streamThinking  = document.getElementById('stream-thinking');

    let accumulated = '';
    let reasoning   = '';

    try {
      const gen = this.llm.stream(apiMessages, {
        model:   model.id,
        signal:  this.abortController.signal,
        thinking: this.settings.get('thinkingEnabled'),
        effort:   this.settings.get('effortLevel'),
      });

      for await (const chunk of gen) {
        if (chunk.reasoning) {
          reasoning += chunk.reasoning;
          streamThinking.style.display = '';
          streamReasoning.textContent = reasoning;
          this._scrollToBottom();
        }
        if (chunk.content) {
          accumulated += chunk.content;
          streamContent.innerHTML = this.renderer.render(accumulated) + '<span class="stream-cursor"></span>';
          this._scrollToBottom();
        }
      }

      // Finalize
      streamContent.innerHTML = this.renderer.render(accumulated);
      bubble.id = '';

      // Save assistant message to history
      const assistantMsg = this.history.addMessage(this.currentConvId, {
        role:       'assistant',
        content:    accumulated,
        reasoning:  reasoning || '',
        model:      model.id,
        modelLabel: model.name,
      });

      // Replace streaming bubble with proper bubble
      const finalBubble = this._appendMessageBubble({ ...assistantMsg, role: 'assistant' });
      bubble.remove();

      // Auto-generate a smart title after the first full exchange
      const freshConv = this.history.getById(this.currentConvId);
      if (freshConv && freshConv.messages.length === 2) {
        this._generateTitle(this.currentConvId, model.id); // fire-and-forget
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        streamContent.innerHTML = `<span style="color:#ff6b6b">⚠ ${this._escHtml(err.message)}</span>`;
        this._toast('Error: ' + err.message);
      } else {
        streamContent.innerHTML = this.renderer.render(accumulated) || '<em>Cancelled</em>';
        bubble.id = '';
      }
    } finally {
      this.isStreaming = false;
      this.abortController = null;
      document.getElementById('send-btn').disabled = false;
      this._updateEditBtn();
      this._renderConvList();
      this._scrollToBottom();
    }
  }

  _redoPrompt(text) {
    if (this.isStreaming) return;
    document.getElementById('message-input').value = text;
    this._sendMessage(text);
  }

  // Edit last prompt: pull last user message back into input, remove last exchange
  _editLastPrompt() {
    if (this.isStreaming || !this.currentConvId) return;
    const conv = this.history.getById(this.currentConvId);
    if (!conv || !conv.messages.length) return;

    // Find the last user message index
    const msgs = [...conv.messages];
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;

    // Put the text back in the input
    const lastText = msgs[lastUserIdx].content;
    document.getElementById('message-input').value = lastText;
    this._autoResizeInput();
    document.getElementById('message-input').focus();

    // Remove from lastUserIdx onwards (user message + any assistant replies after it)
    const trimmed = msgs.slice(0, lastUserIdx);
    this.history.update(this.currentConvId, { messages: trimmed });

    // Re-render the conversation
    this._renderMessages(trimmed);
    this._updateEditBtn();
    this._renderConvList();
    this._toast('Prompt restored for editing');
  }

  // Show the edit-prompt-btn only when there are messages
  _updateEditBtn() {
    const conv = this.currentConvId ? this.history.getById(this.currentConvId) : null;
    const hasMessages = conv && conv.messages.some(m => m.role === 'user');
    const btn = document.getElementById('edit-prompt-btn');
    if (btn) btn.style.display = hasMessages ? 'flex' : 'none';
  }

  // ── Smart AI title generation ──
  async _generateTitle(convId, modelId) {
    const conv = this.history.getById(convId);
    if (!conv || conv.messages.length < 2) return;

    const userText  = conv.messages[0]?.content?.slice(0, 300) || '';
    const aiText    = conv.messages[1]?.content?.slice(0, 400) || '';

    const titleMessages = [
      {
        role: 'system',
        content: 'You are a conversation title generator. Given a chat exchange, respond with ONLY a concise title of 3 to 6 words that captures the core topic. No quotes, no punctuation at the end, no extra text.',
      },
      {
        role: 'user',
        content: `User: "${userText}"\nAssistant: "${aiText}"\n\nTitle:`,
      },
    ];

    try {
      let title = '';
      const gen = this.llm.stream(titleMessages, {
        model:       modelId,
        maxTokens:   18,
        temperature: 0.25,
        thinking:    false, // never use thinking for titles
      });
      for await (const chunk of gen) {
        title += chunk.content;
        if (title.length > 70) break;
      }
      title = title.trim()
        .replace(/^["'`]|["'`]$/g, '')   // strip surrounding quotes
        .replace(/\.$/,'')               // strip trailing period
        .slice(0, 65);
      if (title && title.length > 3) {
        this.history.update(convId, { title });
        this._renderConvList();
      }
    } catch {
      // Fail silently — the auto-titled version is still fine
    }
  }

  _pushToEditor(content) {
    if (!this.editorOpen) this._toggleEditor();
    this.editor.setContent(content, 'md');
    this._toast('Pushed to editor');
  }

  // ══════════════════════════════════════════
  //  UI TOGGLES & HELPERS
  // ══════════════════════════════════════════
  _toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', this.sidebarCollapsed);
  }

  _toggleEditor() {
    this.editorOpen = !this.editorOpen;
    document.getElementById('editor-panel').classList.toggle('hidden', !this.editorOpen);
    document.getElementById('editor-toggle-btn').classList.toggle('active', this.editorOpen);
  }

  _openSettings() {
    try {
      const modal = document.getElementById('settings-modal');
      if (!modal) { console.error('Settings modal not found'); return; }
      modal.classList.remove('hidden');
      // Populate current values
      const s = this.settings.getAll();
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
        else console.warn(`Settings field #${id} not found`);
      };
      setVal('openrouter-key-input', s.openrouterKey);
      setVal('gemini-key-input',     s.geminiKey);
      setVal('hf-key-input',         s.huggingfaceKey);
      setVal('system-prompt-input',  s.systemPrompt);
      setVal('temperature-slider',   s.temperature);
      setVal('max-tokens-slider',    s.maxTokens);
      const tempDisp   = document.getElementById('temp-display');
      const tokDisp    = document.getElementById('tokens-display');
      if (tempDisp)  tempDisp.textContent  = s.temperature;
      if (tokDisp)   tokDisp.textContent   = s.maxTokens;
    } catch(err) {
      console.error('_openSettings error:', err);
      this._toast('⚠ Could not open settings: ' + err.message);
    }
  }

  _closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  _saveSettings() {
    const key       = document.getElementById('openrouter-key-input').value.trim();
    const geminiKey = document.getElementById('gemini-key-input').value.trim();
    const hfKey     = document.getElementById('hf-key-input').value.trim();
    const prompt    = document.getElementById('system-prompt-input').value;
    const temp      = parseFloat(document.getElementById('temperature-slider').value);
    const tokens    = parseInt(document.getElementById('max-tokens-slider').value);

    const hadKey     = this.settings.get('openrouterKey');
    const hadGemini  = this.settings.get('geminiKey');
    const hadHf      = this.settings.get('huggingfaceKey');
    
    this.settings.setMany({ 
      openrouterKey: key, 
      geminiKey, 
      huggingfaceKey: hfKey,
      systemPrompt: prompt, 
      temperature: temp, 
      maxTokens: tokens 
    });

    this._closeSettings();
    this._toast('Settings saved!');

    if (key !== hadKey || geminiKey !== hadGemini || hfKey !== hadHf) this._loadModels();
  }

  _scrollToBottom() {
    const c = document.getElementById('messages-container');
    c.scrollTop = c.scrollHeight;
  }

  _autoResizeInput() {
    const ta = document.getElementById('message-input');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }

  _toast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.classList.add('hidden'), 300);
    }, duration);
  }

  _escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ══════════════════════════════════════════
  //  IMAGE ATTACHMENT
  // ══════════════════════════════════════════
  _handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this._toast('⚠ Only image files are supported');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      this._downscaleImage(src, 800, (base64) => {
        this.stagedImageBase64 = base64;
        document.getElementById('staged-image').src = base64;
        document.getElementById('image-staging').classList.remove('hidden');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be picked again
  }

  _removeAttachedImage() {
    this.stagedImageBase64 = null;
    document.getElementById('image-staging').classList.add('hidden');
    document.getElementById('staged-image').src = '';
  }

  _downscaleImage(dataUrl, maxSize, callback) {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; } 
        else { width = Math.round((width * maxSize) / height); height = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  }

  // ══════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════
  _bindEvents() {
    // New chat
    document.getElementById('new-chat-btn').addEventListener('click', () => this._newConversation());

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => this._toggleSidebar());

    // Model dropdown (custom)
    document.getElementById('model-trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('model-dropdown');
      if (dropdown.classList.contains('open')) this._closeDropdown();
      else this._openDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#model-select-wrap')) this._closeDropdown();
    });

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => this._toggleTheme());

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => this._openSettings());
    document.getElementById('close-settings-btn').addEventListener('click', () => this._closeSettings());
    document.getElementById('cancel-settings-btn').addEventListener('click', () => this._closeSettings());
    document.getElementById('save-settings-btn').addEventListener('click', () => this._saveSettings());
    document.getElementById('settings-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this._closeSettings();
    });

    // Show/hide API keys
    document.getElementById('toggle-key-vis').addEventListener('click', () => {
      const inp = document.getElementById('openrouter-key-input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('toggle-gemini-key-vis').addEventListener('click', () => {
      const inp = document.getElementById('gemini-key-input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('toggle-hf-key-vis').addEventListener('click', () => {
      const inp = document.getElementById('hf-key-input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // Settings sliders — live update display
    document.getElementById('temperature-slider').addEventListener('input', (e) => {
      document.getElementById('temp-display').textContent = parseFloat(e.target.value).toFixed(2);
    });
    document.getElementById('max-tokens-slider').addEventListener('input', (e) => {
      document.getElementById('tokens-display').textContent = e.target.value;
    });

    // Send message
    document.getElementById('send-btn').addEventListener('click', () => this._sendMessage());
    document.getElementById('message-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendMessage(); }
    });
    document.getElementById('message-input').addEventListener('input', () => this._autoResizeInput());

    // Edit last prompt
    document.getElementById('edit-prompt-btn').addEventListener('click', () => this._editLastPrompt());

    // Microphone (STT)
    document.getElementById('mic-btn').addEventListener('click', () => this._handleMic());

    // Image Upload
    const fileInp = document.getElementById('image-upload-input');
    document.getElementById('attach-btn').addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', (e) => this._handleImageUpload(e));
    document.getElementById('remove-staged-btn').addEventListener('click', () => this._removeAttachedImage());

    // Editor panel
    document.getElementById('editor-toggle-btn').addEventListener('click', () => this._toggleEditor());
    document.getElementById('close-editor-btn').addEventListener('click',  () => { this.editorOpen = true; this._toggleEditor(); });
    document.getElementById('export-btn').addEventListener('click', () => {
      const content  = this.editor.getContent();
      const filename = this.editor.getFilename();
      const type     = this.editor.getFileType();
      this.exporter.exportFile(content, filename, type);
      this._toast(`Downloaded ${filename}`);
    });

    // Thinking toggle
    document.getElementById('thinking-toggle').addEventListener('click', (e) => {
      const enabled = !this.settings.get('thinkingEnabled');
      this.settings.set('thinkingEnabled', enabled);
      e.currentTarget.classList.toggle('active', enabled);
      this._toast(enabled ? 'Thinking mode ON' : 'Thinking mode OFF');
    });
    // Restore thinking state
    document.getElementById('thinking-toggle').classList.toggle('active', this.settings.get('thinkingEnabled'));

    // Effort pills
    document.querySelectorAll('.effort-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.effort-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.settings.set('effortLevel', pill.dataset.effort);
      });
      // Restore
      if (pill.dataset.effort === this.settings.get('effortLevel')) pill.classList.add('active');
      else pill.classList.remove('active');
    });

    // Model change
    document.getElementById('model-select').addEventListener('change', (e) => {
      this.settings.set('lastModel', e.target.value);
      if (this.currentConvId) this.history.update(this.currentConvId, { model: e.target.value });
    });

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this._renderConvList(e.target.value);
    });

    // Welcome cards (bound here initially, re-bound after _clearMessages)
    document.querySelectorAll('.wl-card').forEach(card => {
      card.addEventListener('click', () => {
        document.getElementById('message-input').value = card.dataset.prompt;
        this._sendMessage();
      });
    });

    // Keyboard shortcut: Escape cancels streaming
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isStreaming) {
        this.abortController?.abort();
      }
    });
  }

  _handleMic() {
    const btn = document.getElementById('mic-btn');
    if (!this.speech.sttSupported) {
      this._toast('Speech recognition not supported in this browser');
      return;
    }
    if (this.speech.isListening) {
      this.speech.stopListening();
      btn.classList.remove('listening');
      return;
    }
    btn.classList.add('listening');
    this.speech.startListening(
      (interim) => { document.getElementById('message-input').value = interim; this._autoResizeInput(); },
      (final)   => { document.getElementById('message-input').value = final;   this._autoResizeInput(); },
      ()        => { btn.classList.remove('listening'); }
    );
  }
}

// ── Bootstrap ──
window.addEventListener('DOMContentLoaded', () => {
  window.app = new NexusApp();
});
