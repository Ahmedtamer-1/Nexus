/**
 * MarkdownRenderer — renders AI response text via marked.js + highlight.js.
 * Injects copy buttons into code blocks.
 */
class MarkdownRenderer {
  constructor() {
    this._configure();
  }

  _configure() {
    if (typeof marked === 'undefined') return;

    const renderer = new marked.Renderer();

    renderer.code = (code, language) => {
      // marked v10+ passes a token object: code(token)
      let codeText = code;
      let langStr = language;
      if (typeof code === 'object' && code !== null) {
        codeText = code.text;
        langStr = code.lang;
      }

      const lang = (langStr || 'plaintext').toLowerCase();
      let highlighted = '';
      try {
        if (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(codeText, { language: lang }).value;
        } else if (typeof hljs !== 'undefined') {
          highlighted = hljs.highlightAuto(codeText).value;
        } else {
          highlighted = this._escapeHtml(codeText);
        }
      } catch (err) {
        highlighted = this._escapeHtml(codeText);
      }

      return `
        <div class="code-block">
          <div class="code-hdr">
            <span class="code-lang">${lang}</span>
            <div style="display: flex; gap: 8px;">
              ${(lang === 'html' || lang === 'svg' || lang === 'xml') ? `<button class="copy-code-btn" onclick="window._nexusPreviewCode(this)">Preview</button>` : ''}
              <button class="copy-code-btn" onclick="window._nexusCopyCode(this)">Copy</button>
            </div>
          </div>
          <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
        </div>`;
    };

    marked.setOptions({ breaks: true, gfm: true });
    marked.use({ renderer });

    // Global helper for code copy buttons
    window._nexusCopyCode = (btn) => {
      const code = btn.closest('.code-block').querySelector('code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    };

    // Global helper for preview buttons (HTML/SVG -> pushes directly to editor and renders)
    window._nexusPreviewCode = (btn) => {
      const codeBase = btn.closest('.code-block').querySelector('code');
      const code = codeBase.textContent; 
      const app = window.app;
      if (app && app.editor) {
        if (!app.editorOpen) app._toggleEditor();
        app.editor.setContent(code, 'html');
        app.editor.setTab('preview');
      }
    };
  }

  render(text) {
    if (typeof marked === 'undefined') return `<p>${this._escapeHtml(text)}</p>`;
    try {
      return marked.parse(text || '');
    } catch (err) {
      return `<p>${this._escapeHtml(text)}</p>`;
    }
  }

  renderInline(text) {
    if (typeof marked === 'undefined') return this._escapeHtml(text);
    try {
      return marked.parseInline(text || '');
    } catch (err) {
      return this._escapeHtml(text);
    }
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
