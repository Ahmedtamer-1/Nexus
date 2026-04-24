/**
 * EditorManager — handles the right-side editor panel (edit/preview tabs).
 */
class EditorManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.textarea = document.getElementById('editor-textarea');
    this.preview  = document.getElementById('editor-preview');
    this.tabEdit  = document.getElementById('tab-edit');
    this.tabPrev  = document.getElementById('tab-preview');
    this.typeSelect = document.getElementById('file-type-select');
    this.filename   = document.getElementById('editor-filename');
    this.resizer    = document.getElementById('editor-resizer');
    this._currentTab = 'edit';
    this._bindEvents();
  }

  _bindEvents() {
    this.tabEdit.addEventListener('click', () => this.setTab('edit'));
    this.tabPrev.addEventListener('click', () => this.setTab('preview'));
    this.typeSelect.addEventListener('change', () => this._updateFilename());

    // Sidebar Resizer Logic
    let isResizing = false;
    if (this.resizer) {
      this.resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        this.preview.style.pointerEvents = 'none'; // prevent iframe dragging issues
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < window.innerWidth - 300) {
          document.documentElement.style.setProperty('--editor-w', `${newWidth}px`);
        }
      });
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          this.preview.style.pointerEvents = ''; 
        }
      });
    }
  }

  setTab(tab) {
    this._currentTab = tab;
    if (tab === 'edit') {
      this.textarea.classList.remove('hidden');
      this.preview.classList.add('hidden');
      this.tabEdit.classList.add('active');
      this.tabPrev.classList.remove('active');
    } else {
      this.textarea.classList.add('hidden');
      this.preview.classList.remove('hidden');
      this.tabEdit.classList.remove('active');
      this.tabPrev.classList.add('active');
      this._renderPreview();
    }
  }

  _renderPreview() {
    const content = this.textarea.value;
    const type = this.typeSelect.value;
    
    if (type === 'html') {
      this.preview.classList.add('no-pad');
    } else {
      this.preview.classList.remove('no-pad');
    }

    if (type === 'md') {
      this.preview.innerHTML = `<div class="markdown-body">${this.renderer.render(content)}</div>`;
    } else if (type === 'html') {
      this.preview.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.background = '#fff';
      iframe.style.display = 'block';
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-same-origin');
      iframe.srcdoc = content;
      this.preview.appendChild(iframe);
    } else {
      let highlighted = '';
      try {
        highlighted = typeof hljs !== 'undefined'
          ? hljs.highlight(content, { language: type }).value
          : content;
      } catch { highlighted = content; }
      this.preview.innerHTML = `<div class="code-block"><pre><code class="hljs language-${type}">${highlighted}</code></pre></div>`;
    }
  }

  _updateFilename() {
    const ext = this.typeSelect.value;
    const base = this.filename.textContent.replace(/\.[^.]+$/, '') || 'untitled';
    this.filename.textContent = `${base}.${ext}`;
  }

  setContent(content, ext) {
    this.textarea.value = content;
    if (ext && this.typeSelect.querySelector(`option[value="${ext}"]`)) {
      this.typeSelect.value = ext;
    }
    this._updateFilename();
    if (this._currentTab === 'preview') this._renderPreview();
  }

  appendContent(content) {
    this.textarea.value += content;
    if (this._currentTab === 'preview') this._renderPreview();
  }

  getContent() { return this.textarea.value; }
  getFilename() { return this.filename.textContent; }
  getFileType() { return this.typeSelect.value; }
}
