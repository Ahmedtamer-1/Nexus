/**
 * config.js — Pre-seeds your API keys into localStorage on first load.
 * Keep this file private. Do not share or commit to public repos.
 */
(function () {
  const cfg = {
    geminiKey:      'AIzaSyDlw1kVgDP4-32K-GpIJcNV5_efp9gwfSs',
    openrouterKey:  '', // add your OpenRouter key here if you have one
    huggingfaceKey: '', // add your Hugging Face key here
  };

  try {
    const stored = JSON.parse(localStorage.getItem('nexus_settings') || '{}');
    // Only pre-seed if the key isn't already saved (so Settings changes are preserved)
    if (!stored.geminiKey      && cfg.geminiKey)      stored.geminiKey      = cfg.geminiKey;
    if (!stored.openrouterKey  && cfg.openrouterKey)  stored.openrouterKey  = cfg.openrouterKey;
    if (!stored.huggingfaceKey && cfg.huggingfaceKey) stored.huggingfaceKey = cfg.huggingfaceKey;
    localStorage.setItem('nexus_settings', JSON.stringify(stored));
  } catch (e) {
    console.warn('NEXUS config seed failed:', e);
  }
})();
