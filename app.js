/**
 * HAZEL AI — app.js
 * Core application logic: state, API calls, rendering, events
 */

"use strict";

/* ── PERSONAS ─────────────────────────────────────────────── */
const PERSONAS = {
  hazel: {
    name: "Hazel", emoji: "✦",
    color: "#00d9ff", accent: "#0a8fa8",
    glow: "rgba(0,217,255,0.18)",
    system: `You are Hazel, an exceptionally intelligent AI assistant — sharp, warm, and deeply knowledgeable. You have a refined personality: professional yet personable, precise yet creative. You naturally use relevant emojis tastefully (never excessively). You excel at coding, analysis, creative writing, strategy, maths, and meaningful conversation. Format responses with markdown when helpful. Be direct, insightful, and occasionally witty.`
  },
  coder: {
    name: "DevBot", emoji: "⌥",
    color: "#4ade80", accent: "#16a34a",
    glow: "rgba(74,222,128,0.15)",
    system: `You are DevBot, a senior full-stack software engineer AI. You write clean, production-ready code. Always comment your code, explain your reasoning, prefer modern idioms, and point out potential bugs or edge cases. Use markdown code blocks with language labels. Be precise and thorough.`
  },
  writer: {
    name: "Quill", emoji: "✒",
    color: "#fb923c", accent: "#ea580c",
    glow: "rgba(251,146,60,0.15)",
    system: `You are Quill, a world-class creative writing AI. You craft compelling narratives, vivid prose, sharp dialogue, and powerful essays. You help with tone, style, structure, and voice. Be expressive, imaginative, and encourage the user's creative vision.`
  }
};

const STARTERS = [
  { icon: "🧠", text: "Explain quantum entanglement simply" },
  { icon: "💻", text: "Build a REST API in Node.js with auth" },
  { icon: "✍️", text: "Write a gripping opening chapter for a thriller" },
  { icon: "📊", text: "Analyse pros and cons of remote work" },
  { icon: "🌍", text: "Plan a 10-day Japan trip on a budget" },
  { icon: "🔬", text: "What are the latest breakthroughs in AI?" }
];

const SHORTCUTS = [
  { keys: ["Enter"], desc: "Send message" },
  { keys: ["Shift", "Enter"], desc: "New line" },
  { keys: ["Ctrl", "N"], desc: "New chat" },
  { keys: ["Ctrl", "E"], desc: "Export chat" },
  { keys: ["Ctrl", "K"], desc: "Keyboard shortcuts" },
  { keys: ["Esc"], desc: "Close modals" }
];

const SUGGESTION_PILLS = [
  "⚡ Explain in detail", "💡 Give an example",
  "🔀 Compare the options", "💻 Write code for this"
];

/* ── STATE ────────────────────────────────────────────────── */
const state = {
  sessions: [],
  activeId: null,
  loading: false,
  persona: null,
  theme: null,
  temperature: 0.7,
  sidebarOpen: true,
  ratings: {},
  starred: {},
  searchQuery: "",
  streamingId: null,
  recognition: null,
  listening: false,
  streamWords: [],
  streamIdx: 0,
  streamTimer: null
};

/* ── HELPERS ──────────────────────────────────────────────── */
const uid   = () => Math.random().toString(36).slice(2, 10);
const now   = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const title = t => t.trim().split(" ").slice(0, 6).join(" ") || "New Chat";
const qs    = s => document.querySelector(s);
const ce    = t => document.createElement(t);
const cfg   = () => window.HAZEL_CONFIG;

function toast(msg, ms = 2000) {
  const el = qs("#toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

function applyPersonaCSS(p) {
  const r = document.documentElement.style;
  r.setProperty("--p-color",  p.color);
  r.setProperty("--p-accent", p.accent);
  r.setProperty("--p-glow",   p.glow);
}

/* ── MARKDOWN RENDERER ────────────────────────────────────── */
function renderMarkdown(raw) {
  let t = raw
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Fenced code blocks
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.trim()
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
    const safe = escaped.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const forAttr = escaped.replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<div class="code-block"><div class="code-header"><span class="code-lang">${lang||"text"}</span><button class="code-copy" data-code="${forAttr}" onclick="copyCode(this)">Copy</button></div><div class="code-body"><code>${safe}</code></div></div>`;
  });

  // Inline code
  t = t.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  // Bold + italic
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Headings
  t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  t = t.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  t = t.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  // Blockquote
  t = t.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // HR
  t = t.replace(/^---$/gm, '<hr>');
  // Links
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Tables
  t = t.replace(/(\|.+\|\n)(\|[-|: ]+\|\n)((?:\|.+\|\n?)+)/g, (_, hdr, sep, body) => {
    const ths = hdr.trim().split("|").filter(Boolean).map(c=>`<th>${c.trim()}</th>`).join("");
    const rows = body.trim().split("\n").map(r =>
      `<tr>${r.split("|").filter(Boolean).map(c=>`<td>${c.trim()}</td>`).join("")}</tr>`
    ).join("");
    return `<div class="tbl-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
  });
  // Lists
  t = t.replace(/^[\-\*\+] (.+)$/gm, '<li class="ul-li">$1</li>');
  t = t.replace(/(<li class="ul-li">[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  t = t.replace(/^\d+\. (.+)$/gm, '<li class="ol-li">$1</li>');
  t = t.replace(/(<li class="ol-li">[\s\S]*?<\/li>)/g, '<ol>$1</ol>');
  // Paragraphs
  t = t.split(/\n\n+/).map(b => b.startsWith('<') ? b : `<p>${b.replace(/\n/g,'<br>')}</p>`).join('\n');

  return t;
}

window.copyCode = function(btn) {
  const code = btn.getAttribute("data-code")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1500);
  });
};

/* ── SESSION MANAGEMENT ───────────────────────────────────── */
function createSession() {
  return { id: uid(), title: "New Chat", messages: [], pinned: false, ts: Date.now() };
}

function getActive() {
  return state.sessions.find(s => s.id === state.activeId);
}

function newChat() {
  const s = createSession();
  state.sessions.unshift(s);
  state.activeId = s.id;
  renderSidebar();
  renderMessages();
  qs("#chat-title").textContent = "New Chat";
  qs("#user-input").focus();
}

function switchSession(id) {
  state.activeId = id;
  const s = getActive();
  qs("#chat-title").textContent = s?.title || "New Chat";
  renderSidebar();
  renderMessages();
}

function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (!state.sessions.length) state.sessions.push(createSession());
  if (state.activeId === id) switchSession(state.sessions[0].id);
  else renderSidebar();
}

function togglePin(id) {
  const s = state.sessions.find(s => s.id === id);
  if (s) s.pinned = !s.pinned;
  renderSidebar();
}

function exportChat() {
  const s = getActive();
  if (!s || !s.messages.length) { toast("Nothing to export yet"); return; }
  const p = PERSONAS[state.persona];
  const md = s.messages.map(m =>
    `**${m.role === "user" ? "You" : p.name}** · ${m.ts}\n\n${m.content}`
  ).join("\n\n---\n\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = ce("a"); a.href = url;
  a.download = `hazel-chat-${Date.now()}.md`; a.click();
  URL.revokeObjectURL(url);
  toast("💾 Chat exported!");
}

/* ── SIDEBAR RENDER ───────────────────────────────────────── */
function renderSidebar() {
  const q = state.searchQuery.toLowerCase();
  let list = state.sessions.filter(s =>
    !q || s.title.toLowerCase().includes(q) ||
    s.messages.some(m => m.content.toLowerCase().includes(q))
  );
  // Pinned first
  list = [...list.filter(s => s.pinned), ...list.filter(s => !s.pinned)];

  const el = qs("#session-list");
  el.innerHTML = "";

  if (!list.length) {
    el.innerHTML = `<p style="font-size:12px;color:var(--muted);text-align:center;padding:16px 0">No chats found</p>`;
    return;
  }

  let shownPinLabel = false, shownRecLabel = false;
  list.forEach(s => {
    if (s.pinned && !shownPinLabel) {
      const lbl = ce("div"); lbl.className = "session-label"; lbl.textContent = "📌 Pinned";
      el.appendChild(lbl); shownPinLabel = true;
    }
    if (!s.pinned && !shownRecLabel) {
      const lbl = ce("div"); lbl.className = "session-label"; lbl.textContent = "Recent";
      el.appendChild(lbl); shownRecLabel = true;
    }

    const item = ce("div");
    item.className = "session-item" + (s.id === state.activeId ? " active" : "");
    item.innerHTML = `
      <svg class="session-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <div class="session-info">
        <div class="session-title">${s.title}</div>
        <div class="session-count">${s.messages.length} messages</div>
      </div>
      <div class="session-actions">
        <button class="icon-btn-sm" title="${s.pinned?'Unpin':'Pin'}" onclick="event.stopPropagation();togglePin('${s.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${s.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
        </button>
        <button class="icon-btn-sm" title="Delete" onclick="event.stopPropagation();deleteSession('${s.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    `;
    item.addEventListener("click", () => switchSession(s.id));
    el.appendChild(item);
  });
}

/* ── MESSAGES RENDER ──────────────────────────────────────── */
function renderMessages() {
  const el = qs("#messages");
  el.innerHTML = "";
  const s = getActive();
  const msgs = s?.messages || [];

  if (!msgs.length) {
    el.appendChild(buildEmptyState());
    return;
  }

  msgs.forEach(msg => el.appendChild(buildMsgRow(msg)));
  scrollBottom();
}

function buildEmptyState() {
  const div = ce("div"); div.id = "empty-state";
  const p = PERSONAS[state.persona];
  div.innerHTML = `
    <div class="empty-logo">${svgLogo(56)}</div>
    <div class="empty-title">Hello, I'm ${p.name} ${p.emoji}</div>
    <div class="empty-sub">An advanced AI designed to think deeply, code brilliantly,<br>write creatively, and converse meaningfully.</div>
    <div class="starters">
      ${STARTERS.map((s,i) => `<button class="starter-chip" style="animation-delay:${i*0.07}s" onclick="fillInput('${s.text.replace(/'/g,"\\'")}')"><span>${s.icon}</span> ${s.text}</button>`).join("")}
    </div>
  `;
  return div;
}

function buildMsgRow(msg) {
  const isUser = msg.role === "user";
  const p = PERSONAS[msg.persona || state.persona] || PERSONAS[state.persona];

  const row = ce("div");
  row.className = `msg-row ${msg.role}`;
  row.dataset.id = msg.id;

  const metaDir = isUser ? "row-reverse" : "row";
  row.innerHTML = `
    <div class="msg-meta" style="flex-direction:${metaDir}">
      <div class="msg-avatar ${msg.role}">${isUser ? "U" : p.emoji}</div>
      <span class="msg-role">${isUser ? "You" : p.name}</span>
      ${cfg().SHOW_TIMESTAMPS ? `<span class="msg-time">${msg.ts}</span>` : ""}
      ${state.starred[msg.id] ? '<span class="msg-starred">⭐</span>' : ""}
    </div>
    <div class="msg-bubble-wrap">
      <div class="msg-bubble ${msg.role} md-body" id="bubble-${msg.id}">
        ${isUser
          ? `<span style="white-space:pre-wrap">${msg.content.replace(/</g,"&lt;")}</span>`
          : renderMarkdown(msg.content)}
      </div>
      ${!isUser ? buildActions(msg.id) : ""}
    </div>
  `;
  return row;
}

function buildActions(id) {
  const rating = state.ratings[id];
  return `
    <div class="msg-actions">
      <button class="action-btn" onclick="copyMsg('${id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="action-btn ${rating==='up'?'active':''}" onclick="rateMsg('${id}','up')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        Like
      </button>
      <button class="action-btn ${rating==='down'?'active':''}" onclick="rateMsg('${id}','down')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
        Dislike
      </button>
      <button class="action-btn ${state.starred[id]?'active':''}" onclick="starMsg('${id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${state.starred[id]?'#fbbf24':'none'}" stroke="${state.starred[id]?'#fbbf24':'currentColor'}" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Star
      </button>
      <button class="action-btn" onclick="regenerate()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Retry
      </button>
    </div>
  `;
}

/* ── MESSAGE ACTIONS ──────────────────────────────────────── */
window.copyMsg = function(id) {
  const s = getActive();
  const msg = s?.messages.find(m => m.id === id);
  if (!msg) return;
  navigator.clipboard.writeText(msg.content).then(() => toast("✅ Copied to clipboard!"));
};

window.rateMsg = function(id, val) {
  state.ratings[id] = state.ratings[id] === val ? null : val;
  const row = qs(`[data-id="${id}"]`);
  if (row) {
    const actionsEl = row.querySelector(".msg-actions");
    if (actionsEl) actionsEl.outerHTML = buildActions(id);
  }
};

window.starMsg = function(id) {
  state.starred[id] = !state.starred[id];
  const row = qs(`[data-id="${id}"]`);
  if (row) row.outerHTML = (() => {
    const s = getActive();
    const msg = s?.messages.find(m => m.id === id);
    if (!msg) return "";
    const tmp = ce("div");
    tmp.appendChild(buildMsgRow(msg));
    return tmp.innerHTML;
  })();
  toast(state.starred[id] ? "⭐ Message starred" : "Unstarred");
};

window.regenerate = async function() {
  const s = getActive();
  if (!s || state.loading) return;
  const lastUser = [...s.messages].reverse().find(m => m.role === "user");
  if (!lastUser) return;
  const idx = s.messages.findLastIndex(m => m.role === "assistant");
  if (idx > -1) s.messages.splice(idx, 1);
  renderMessages();
  await callAPI(lastUser.content, s.messages);
};

window.togglePin  = togglePin;
window.deleteSession = deleteSession;
window.fillInput  = t => { qs("#user-input").value = t; updateCharCount(); qs("#user-input").focus(); };

/* ── STREAMING ────────────────────────────────────────────── */
function startStreaming(msgId, fullText) {
  if (!cfg().STREAMING_EFFECT) {
    const bubble = qs(`#bubble-${msgId}`);
    if (bubble) bubble.innerHTML = renderMarkdown(fullText);
    return;
  }
  const words = fullText.split(" ");
  state.streamWords = words;
  state.streamIdx = 0;
  state.streamingId = msgId;

  const tick = () => {
    const bubble = qs(`#bubble-${msgId}`);
    if (!bubble || state.streamIdx >= words.length) {
      if (bubble) bubble.innerHTML = renderMarkdown(fullText);
      state.streamingId = null;
      return;
    }
    const partial = words.slice(0, state.streamIdx + 1).join(" ") + " ";
    bubble.innerHTML = `<span>${partial.replace(/</g,"&lt;")}</span>`;
    state.streamIdx++;
    scrollBottom();
    const delay = cfg().WORD_DELAY_MS + Math.random() * 15;
    state.streamTimer = setTimeout(tick, delay);
  };
  tick();
}

/* ── API CALL ─────────────────────────────────────────────── */
async function callAPI(userText, history) {
  const apiKey = cfg().ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    showError("⚠️ Please set your API key in <strong>config.js</strong>. Open the file and replace <code>YOUR_API_KEY_HERE</code> with your Anthropic key from <a href='https://console.anthropic.com' target='_blank'>console.anthropic.com</a>.");
    return;
  }

  setLoading(true);

  const p = PERSONAS[state.persona];
  const histMsgs = history
    .slice(-cfg().MAX_HISTORY_MESSAGES)
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: cfg().MODEL,
        max_tokens: cfg().MAX_TOKENS,
        system: p.system,
        messages: histMsgs
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "API error");

    const text = data.content?.map(b => b.text || "").join("") || "I couldn't generate a response.";
    const aiMsg = { id: uid(), role: "assistant", content: text, ts: now(), persona: state.persona };

    const s = getActive();
    if (s) s.messages.push(aiMsg);

    // Append row then stream into it
    const row = buildMsgRow(aiMsg);
    qs("#messages").appendChild(row);
    scrollBottom();

    // Clear bubble for streaming
    const bubble = qs(`#bubble-${aiMsg.id}`);
    if (bubble) bubble.innerHTML = '<span style="opacity:.4">…</span>';

    startStreaming(aiMsg.id, text);

  } catch (err) {
    showError("⚠️ " + (err.message || "Something went wrong. Check your API key and try again."));
  } finally {
    setLoading(false);
  }
}

/* ── SEND MESSAGE ─────────────────────────────────────────── */
async function sendMessage() {
  const inp = qs("#user-input");
  const text = inp.value.trim();
  if (!text || state.loading) return;

  clearError();
  inp.value = "";
  inp.style.height = "auto";
  updateCharCount();
  hideSuggestions();

  const s = getActive();
  if (!s) return;

  const userMsg = { id: uid(), role: "user", content: text, ts: now() };
  if (s.messages.length === 0) {
    s.title = title(text);
    qs("#chat-title").textContent = s.title;
  }
  s.messages.push(userMsg);

  // Remove empty state if present
  const empty = qs("#empty-state");
  if (empty) empty.remove();

  // Append user row
  qs("#messages").appendChild(buildMsgRow(userMsg));
  scrollBottom();

  await callAPI(text, s.messages);
  renderSidebar();
}

/* ── UI HELPERS ───────────────────────────────────────────── */
function setLoading(v)
