              const HAZEL_CONFIG = {

  // ─────────────────────────────────────────────
  //  7bf09ef8981651a25a6214c25ea083a1e95f69a5
  // ─────────────────────────────────────────────
  ANTHROPIC_API_KEY: "YOUR_API_KEY_HERE",

  // ─────────────────────────────────────────────
  //  🤖  MODEL SETTINGS
  // ─────────────────────────────────────────────
  MODEL: "Hazel.1.0 pro,          // AI model to use
  MAX_TOKENS: 1500,                   // Max response length (higher = longer answers)
  DEFAULT_TEMPERATURE: 0.7,           // 0 = focused/precise, 1 = creative/random

  // ─────────────────────────────────────────────
  //  🎨  APPEARANCE
  // ─────────────────────────────────────────────
  DEFAULT_THEME: "dark",              // "dark" | "light" | "midnight"
  DEFAULT_PERSONA: "hazel",          // "hazel" | "coder" | "writer"
  BOT_NAME: "Hazel",                 // Change your bot's display name
  SHOW_TIMESTAMPS: true,             // Show message timestamps
  ENABLE_VOICE: true,                // Enable microphone / voice input

  // ─────────────────────────────────────────────
  //  💬  CHAT BEHAVIOUR
  // ─────────────────────────────────────────────
  MAX_HISTORY_MESSAGES: 40,          // How many messages to keep in memory
  ENABLE_MARKDOWN: true,             // Render markdown in responses
  STREAMING_EFFECT: true,            // Word-by-word typing animation
  WORD_DELAY_MS: 22,                 // Speed of streaming (lower = faster)

};

Object.freeze(HAZEL_CONFIG);
window.HAZEL_CONFIG = HAZEL_CONFIG;
  
