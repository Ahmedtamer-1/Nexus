/**
 * SpeechManager — wraps Web Speech API for TTS and STT.
 * No external APIs or costs required.
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this._currentUtterance = null;
    this._onEndCallback = null;

    // Speech-to-Text setup
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.onend = () => {
        this.isListening = false;
        this._onEndCallback?.();
      };
    }
  }

  // ── Text to Speech ──
  speak(text, onEnd) {
    if (!this.synth) return;
    this.stop();
    const clean = text.replace(/```[\s\S]*?```/g, 'code block').replace(/[#*_`~>]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd?.();
    };
    utterance.onerror = () => { this.isSpeaking = false; };
    this._currentUtterance = utterance;
    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  stop() {
    this.synth?.cancel();
    this.isSpeaking = false;
    this._currentUtterance = null;
  }

  toggleSpeak(text, btn, onEnd) {
    if (this.isSpeaking) {
      this.stop();
      if (btn) btn.title = 'Read aloud';
      return;
    }
    if (btn) btn.title = 'Stop reading';
    this.speak(text, () => {
      if (btn) btn.title = 'Read aloud';
      onEnd?.();
    });
  }

  // ── Speech to Text ──
  get sttSupported() { return !!this.recognition; }

  startListening(onInterim, onFinal, onEnd) {
    if (!this.recognition || this.isListening) return false;
    this._onEndCallback = onEnd;
    this.recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      const isFinal = e.results[e.results.length - 1].isFinal;
      if (isFinal) {
        onFinal?.(transcript);
      } else {
        onInterim?.(transcript);
      }
    };
    this.recognition.start();
    this.isListening = true;
    return true;
  }

  stopListening() {
    this.recognition?.stop();
    this.isListening = false;
  }
}
