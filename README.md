# 🌌 NEXUS

NEXUS is a premium, local-first web-based AI interface built with Vanilla HTML, CSS, and JS. It features a stunning brutalist glassmorphism aesthetic and connects you instantly to the world's most powerful LLMs without the need for an external backend database or Node server. Everything runs seamlessly in your browser with zero data telemetry.

<img src="assets/flux-car.png" alt="NEXUS UI - FLUX Image Generation" width="100%">
<div style="display:flex; gap:10px; margin-top: 10px;">
  <img src="assets/split-editor.png" alt="Sandboxed Dual-Pane Editor" width="49%">
  <img src="assets/settings-ui.png" alt="Settings & API Modals" width="49%">
</div>

## ✨ Core Features & Technical Highlights

NEXUS isn't just a basic API wrapper—it's a deeply engineered client-side client meant to mirror the advanced features of enterprise platforms like Claude or ChatGPT, completely for free. 

### 🔐 Uncompromising Local-First Architecture
* **Bring Your Own Key (BYOK):** Your API keys (OpenRouter, Gemini, Hugging Face) and entire chat history are encrypted and stored in `localStorage` securely inside your browser. No middleman servers, no rate-limiting, and zero telemetry tracking.
* **Smart Local History:** Conversations are managed using an SQLite-style local manager indexing timestamps, models, branching prompts, and invisible metadata.

### 🧠 Multiplexer LLM Factory
* **Dynamic Routing:** NEXUS intelligently routes backend prompts depending on the active model. Select `Gemini 2.5 Flash`, and it routes natively through the `Google Generative Language API`. Select `Llama 3 70B`, and it bridges seamlessly through OpenRouter. 
* **Native Thinking Support:** Full UI integration for structural "Thinking" protocols (like those output by Gemini 2.5). Animated think-blocks expand and collapse inside the chat automatically, capturing backend reasoning tokens cleanly. 

### 🖼️ Seamless Multimodality & Vision
* **Auto-Compressing Image Attachments:** Upload visual data for vision-capable models! NEXUS utilizes an internal client-side `<canvas>` downscaling engine to intelligently compress images to 800px. This guarantees high-performance network payloads and prevents your local storage from overflowing with 4K metadata.
* **Standardized JSON Compilation:** Base64 image data is parsed into standard `{"type": "image_url"}` Vision Arrays right before execution, guaranteeing fluid compatibility across Gemini and OpenAI-styled models.

### 🎨 Generative Text-to-Image Built In
* **Hugging Face Inference:** Enter your free HF Token to instantly unlock state-of-the-art image diffusion models like **FLUX.1 Schnell** and **Stable Diffusion 3.5**.
* **Zero-Touch Renders:** When talking to an Image Gen model, NEXUS hooks the Hugging Face Serverless pipeline, retrieves the generated binary `blob`, builds a temporary local URL, and injects the resulting artwork seamlessly back into your chat UI using the Markdown parser. 

### 💻 Dual-Pane Workspace & Claude-Style Artifacts
* **The Web Sandbox:** Generated any code? Hit the glowing "Preview" button inside the AI's Markdown. NEXUS immediately throws the raw code into an adjustable, sandboxed `<iframe>` to the right of your chat. 
* **Syntax Highlighting:** Raw code is powered by `highlight.js` logic with one-click copy and file export capabilities allowing rapid frontend development tracking.

### 🎙️ Web Voice I/O Engine
* **Native OS Integrations:** Speak directly to NEXUS by pressing the microphone. Responses can be seamlessly spoken back to you via the `Speech Synthesis API`.

### 💅 Brutalist Glassmorphism UI
* **Theme Engine:** Clean toggling between dark-mode abyss blacks and sleek light-mode aesthetics.
* **Contextual Modals:** Z-index engineered custom drop downs, responsive flexbox chat bubbles, and auto-resizing text boxes designed exclusively from scratch.

## 🚀 Quick Setup

Since NEXUS is entirely client-side, setup takes roughly 3 seconds.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ahmedtamer-1/Nexus.git
   cd Nexus
   ```
2. **Open `index.html`:** Look for it in your file explorer and double click it. That's literally it.
3. **Configure Settings:** Click the `⚙ Settings` button in the bottom left of the interface to paste in your API credentials.

## 🧠 Supported Providers

NEXUS intelligently fetches models from:
* **Google Gemini API** (Free Tier native integration via Google AI Studio)
* **OpenRouter** (For broad foundational models across providers)
* **Hugging Face** (Free Serverless Inference API for Text Generation and Image Diffusion)

## 📁 Repository Structure

```text
├── index.html                  # Main UI layout and templates
├── config.js                   # Base fallback configurations
├── css/
│   └── style.css               # Centralized Dark/Light Theme System + Glassmorphism
└── js/
    ├── app.js                  # Core Application & DOM Event Binding
    ├── history.js              # LocalStorage SQLite-style History Manager
    ├── renderer.js             # Marked.js Markdown parser & Syntax logic
    ├── editor.js               # Dual-tab Web Editor & Sandboxed iFrame
    ├── speech.js               # STT / TTS Web Speech API
    └── llm/
        ├── LLMFactory.js       # The Routing Brain
        └── providers/          # Modular API Integrations
            ├── GeminiProvider.js 
            ├── HuggingFaceProvider.js
            └── OpenRouterProvider.js 
```

## 🛠 Tech Stack
- **HTML5 / CSS3 / ES6 Javascript**
- **Marked.js** (Markdown Rendering)
- **Highlight.js** (Code Block syntax highlighting)

---
*Developed by [Ahmedtamer-1](https://github.com/Ahmedtamer-1).*
