/**
 * ExporterManager — downloads editor content or conversation history as files.
 */
class ExporterManager {
  _download(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportFile(content, filename, fileType) {
    const mimeMap = {
      md:   'text/markdown',
      txt:  'text/plain',
      js:   'text/javascript',
      ts:   'text/typescript',
      py:   'text/x-python',
      html: 'text/html',
      css:  'text/css',
      json: 'application/json',
      sql:  'text/x-sql',
      sh:   'text/x-shellscript',
    };
    const mime = mimeMap[fileType] || 'text/plain';
    this._download(content, filename, mime);
  }

  exportConversation(conversation) {
    if (!conversation) return;
    let md = `# ${conversation.title}\n\n`;
    md += `_Exported from NEXUS · ${new Date().toLocaleString()}_\n\n---\n\n`;
    conversation.messages.forEach(msg => {
      const who = msg.role === 'user' ? '**You**' : `**${msg.modelLabel || 'Assistant'}**`;
      md += `${who}:\n\n${msg.content}\n\n---\n\n`;
    });
    const safe = conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    this._download(md, `${safe}.md`, 'text/markdown');
  }
}
