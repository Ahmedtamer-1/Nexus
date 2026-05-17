/**
 * RagProvider — Connects NEXUS to our local Legal RAG Python backend.
 */
class RagProvider {
  static MODELS = [
    { id: 'local-legal-rag', name: 'Legal Assistant (Local RAG)', context: 32000, provider: 'Local Agent' }
  ];

  constructor(apiKey) {
    this.apiKey = apiKey; // Inherits openrouterKey as a proxy for OpenAI key
  }

  async *stream(messages, options = {}) {
    try {
      const response = await fetch('http://localhost:8002/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          api_key: this.apiKey, 
          model: 'gpt-4o-mini' // You can switch this to whatever model the backend uses
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to connect to Local RAG API');
      }

      const data = await response.json();
      const text = data.choices[0].message.content;

      // Yield the text in chunks to simulate streaming for the UI
      const chunks = text.match(/.{1,15}/g) || [];
      for (const chunk of chunks) {
        yield { content: chunk };
        await new Promise(r => setTimeout(r, 10)); // tiny delay to animate the typing effect
      }

    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        yield { content: '⚠️ **Error:** Cannot connect to Local RAG API. Ensure you are running `uvicorn app:app --reload` inside the `backend/` directory.' };
      } else {
        yield { content: `⚠️ **Error:** ${e.message}` };
      }
    }
  }
}
