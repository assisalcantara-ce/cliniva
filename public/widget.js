/**
 * Cliniva Universal Chat Widget (Embed Script) v2.0 — Redesign Premium & Acolhedor
 * 
 * Widget conversacional multi-tenant com IA nativo do Cliniva.
 * Auto-contido, isolado, responsivo, acessível e protegido contra XSS.
 * 
 * Uso:
 * <script 
 *   src="https://cliniva.com.br/widget.js" 
 *   data-slug="dra-cristiane" 
 *   data-api-url="https://cliniva.com.br"
 *   data-primary-color="#68152D"
 *   data-accent-color="#B78449"
 *   data-bg-color="#FAF6F1"
 *   data-text-color="#342A2D"
 *   data-title="Assistente Virtual"
 *   data-subtitle="Atendimento online"
 *   data-launcher-image="/images/assistente.png"
 *   async>
 * </script>
 */
(function () {
  "use strict";

  // Previne carregamento duplicado na mesma página
  if (window.__CLINIVA_CHAT_WIDGET_LOADED__) return;
  window.__CLINIVA_CHAT_WIDGET_LOADED__ = true;

  // 1. Extração de Configuração do Script Tag
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var config = {
    slug: (currentScript && currentScript.getAttribute("data-slug")) || "dra-cristiane",
    apiUrl: ((currentScript && currentScript.getAttribute("data-api-url")) || "").replace(/\/$/, ""),
    primaryColor: (currentScript && currentScript.getAttribute("data-primary-color")) || "#68152D",
    accentColor: (currentScript && currentScript.getAttribute("data-accent-color")) || "#B78449",
    bgColor: (currentScript && currentScript.getAttribute("data-bg-color")) || "#FAF6F1",
    textColor: (currentScript && currentScript.getAttribute("data-text-color")) || "#342A2D",
    title: (currentScript && currentScript.getAttribute("data-title")) || "Assistente Virtual",
    subtitle: (currentScript && currentScript.getAttribute("data-subtitle")) || "Atendimento online",
    avatarUrl: (currentScript && (currentScript.getAttribute("data-avatar-url") || currentScript.getAttribute("data-launcher-image"))) || "",
    launcherImage: (currentScript && currentScript.getAttribute("data-launcher-image")) || "",
    storageKey: "cliniva_chat_session_" + ((currentScript && currentScript.getAttribute("data-slug")) || "default"),
  };

  if (!config.apiUrl && currentScript && currentScript.src) {
    try {
      var u = new URL(currentScript.src);
      config.apiUrl = u.origin;
    } catch (e) {
      config.apiUrl = window.location.origin;
    }
  }

  // 2. Estado do Widget
  var state = {
    isOpen: false,
    isMinimized: false,
    sessionId: null,
    sessionToken: null,
    messages: [],
    isLoading: false,
    errorMessage: null,
    pendingProposal: null,
    consentChecked: false,
    isConfirming: false,
    completedAppointment: null,
    remainingMessages: 30,
  };

  var INITIAL_SUGGESTIONS = [
    "Quais são os horários disponíveis esta semana?",
    "Como funciona o atendimento presencial e online?",
    "Gostaria de agendar uma consulta."
  ];

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function generateIdempotencyKey() {
    return "idemp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 12);
  }

  function formatTime(dateObj) {
    try {
      var d = dateObj ? new Date(dateObj) : new Date();
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  // 3. Criação do Contêiner
  var container = document.createElement("div");
  container.id = "cliniva-chat-widget-root";
  document.body.appendChild(container);

  // 4. Injeção de Estilos Scoped
  var style = document.createElement("style");
  style.id = "cliniva-chat-widget-styles";
  style.textContent = `
    #cliniva-chat-widget-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.45;
    }

    #cliniva-chat-widget-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Launcher Padrão Elegante com Avatar */
    .cliniva-btn-launcher {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: ${config.primaryColor};
      color: #FAF6F1;
      padding: 8px 20px 8px 10px;
      border-radius: 9999px;
      box-shadow: 0 14px 32px -6px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(104, 21, 45, 0.25);
      border: 1.5px solid rgba(183, 132, 73, 0.5);
      cursor: pointer;
      font-weight: 600;
      font-size: 13.5px;
      letter-spacing: 0.01em;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
      outline: none;
      user-select: none;
    }

    .cliniva-btn-launcher:hover {
      transform: scale(1.04) translateY(-2px);
      box-shadow: 0 18px 36px -6px rgba(0, 0, 0, 0.42);
    }

    .cliniva-btn-launcher:active {
      transform: scale(0.97);
    }

    .cliniva-launcher-avatar-wrap {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      border: 1.5px solid ${config.accentColor};
      background: #470E20;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cliniva-launcher-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cliniva-launcher-avatar-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FAF6F1;
    }

    .cliniva-launcher-badge {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 10px;
      height: 10px;
      background: #10B981;
      border: 2px solid ${config.primaryColor};
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.9);
    }

    /* Janela do Chat Premium */
    .cliniva-card-window {
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 48px);
      background-color: ${config.bgColor};
      border-radius: 24px;
      box-shadow: 0 24px 54px -12px rgba(0, 0, 0, 0.3), 0 8px 24px -4px rgba(104, 21, 45, 0.15);
      border: 1px solid rgba(183, 132, 73, 0.35);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: clinivaWindowOpen 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom right;
    }

    .cliniva-card-window.minimized {
      height: 68px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
    }

    /* 1. CABEÇALHO */
    .cliniva-header {
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%);
      color: #FAF6F1;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(183, 132, 73, 0.3);
      user-select: none;
      flex-shrink: 0;
    }

    .cliniva-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .cliniva-header-avatar-wrap {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid ${config.accentColor};
      background: #470E20;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .cliniva-header-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .cliniva-header-avatar-fallback {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FAF6F1;
    }

    .cliniva-header-status-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 11px;
      height: 11px;
      background: #10B981;
      border: 2px solid ${config.primaryColor};
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.9);
    }

    .cliniva-header-text {
      min-width: 0;
    }

    .cliniva-header-title {
      font-weight: 700;
      font-size: 14.5px;
      line-height: 1.25;
      color: #FAF6F1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cliniva-header-subtitle {
      font-size: 11px;
      color: #EED9CF;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }

    .cliniva-header-sub-dot {
      width: 6px;
      height: 6px;
      background: #10B981;
      border-radius: 50%;
      display: inline-block;
    }

    .cliniva-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cliniva-header-btn {
      background: transparent;
      border: none;
      color: #FAF6F1;
      opacity: 0.85;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      outline: none;
    }

    .cliniva-header-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.16);
      transform: scale(1.05);
    }

    /* 2. ÁREA DE MENSAGENS COM SCROLL INTELIGENTE */
    .cliniva-messages-box {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .cliniva-messages-box::-webkit-scrollbar {
      width: 5px;
    }
    .cliniva-messages-box::-webkit-scrollbar-track {
      background: transparent;
    }
    .cliniva-messages-box::-webkit-scrollbar-thumb {
      background: rgba(183, 132, 73, 0.3);
      border-radius: 9999px;
    }

    /* BALÕES DE MENSAGENS */
    .cliniva-msg-row {
      display: flex;
      flex-direction: column;
      max-width: 86%;
      animation: clinivaMsgIn 0.2s ease-out;
    }

    .cliniva-msg-row.assistant {
      align-self: flex-start;
    }

    .cliniva-msg-row.user {
      align-self: flex-end;
    }

    .cliniva-msg-bubble {
      padding: 11px 15px;
      font-size: 13px;
      line-height: 1.55;
      letter-spacing: -0.01em;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .cliniva-msg-row.assistant .cliniva-msg-bubble {
      background: #FFFFFF;
      color: ${config.textColor};
      border: 1px solid rgba(183, 132, 73, 0.22);
      border-radius: 18px 18px 18px 4px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
    }

    .cliniva-msg-row.user .cliniva-msg-bubble {
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%);
      color: #FAF6F1;
      border-radius: 18px 18px 4px 18px;
      box-shadow: 0 4px 14px rgba(104, 21, 45, 0.22);
    }

    .cliniva-msg-time {
      font-size: 10px;
      margin-top: 4px;
      opacity: 0.65;
    }

    .cliniva-msg-row.assistant .cliniva-msg-time {
      margin-left: 6px;
      color: #666;
    }

    .cliniva-msg-row.user .cliniva-msg-time {
      margin-right: 6px;
      align-self: flex-end;
      color: #777;
    }

    /* 3. PERGUNTAS SUGERIDAS (CHIPS ELEGANTES) */
    .cliniva-quick-prompts-wrapper {
      padding: 4px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
      animation: clinivaFadeIn 0.25s ease-out;
    }

    .cliniva-quick-prompts-label {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${config.accentColor};
      margin-bottom: 2px;
    }

    .cliniva-quick-prompts-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .cliniva-prompt-chip {
      background: #FFFFFF;
      border: 1px solid rgba(183, 132, 73, 0.35);
      border-radius: 9999px;
      padding: 7px 13px;
      font-size: 11.5px;
      color: ${config.textColor};
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      user-select: none;
      line-height: 1.35;
      outline: none;
    }

    .cliniva-prompt-chip:hover {
      border-color: ${config.primaryColor};
      background: #FFF7F2;
      color: ${config.primaryColor};
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(104, 21, 45, 0.08);
    }

    /* 4. CAMPO DE MENSAGEM & RODAPÉ */
    .cliniva-input-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-top: 1px solid rgba(183, 132, 73, 0.2);
      background: #FFFFFF;
      flex-shrink: 0;
    }

    .cliniva-input-field {
      flex: 1;
      border: 1px solid rgba(183, 132, 73, 0.35);
      border-radius: 9999px;
      padding: 9px 16px;
      font-size: 12.5px;
      outline: none;
      background: #FAF6F1;
      color: ${config.textColor};
      transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
    }

    .cliniva-input-field:focus {
      border-color: ${config.primaryColor};
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(104, 21, 45, 0.12);
    }

    .cliniva-btn-send {
      background: ${config.primaryColor};
      color: #FAF6F1;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s ease, background-color 0.2s, opacity 0.2s;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(104, 21, 45, 0.22);
      outline: none;
    }

    .cliniva-btn-send:hover:not(:disabled) {
      transform: scale(1.06);
      background: #470E20;
    }

    .cliniva-btn-send:disabled {
      background: #D1D5DB;
      color: #9CA3AF;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .cliniva-input-footnote {
      font-size: 9.5px;
      color: #888;
      text-align: center;
      padding: 0 16px 8px;
      background: #FFFFFF;
      flex-shrink: 0;
    }

    /* 5. EXPERIÊNCIA VISUAL: INDICADORES E CARDS */
    .cliniva-typing-indicator {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: #FFFFFF;
      border-radius: 18px 18px 18px 4px;
      border: 1px solid rgba(183, 132, 73, 0.22);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .cliniva-typing-text {
      font-size: 11.5px;
      color: #666;
      margin-right: 2px;
    }

    .cliniva-dots-group {
      display: flex;
      align-items: center;
      gap: 3.5px;
    }

    .cliniva-dot {
      width: 5px;
      height: 5px;
      background: ${config.primaryColor};
      border-radius: 50%;
      animation: clinivaDotPulse 1.2s infinite ease-in-out;
    }
    .cliniva-dot:nth-child(2) { animation-delay: 0.2s; }
    .cliniva-dot:nth-child(3) { animation-delay: 0.4s; }

    .cliniva-error-card {
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 11.5px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.4;
    }

    .cliniva-proposal-card {
      background: #FFFFFF;
      border: 2px solid ${config.accentColor};
      border-radius: 16px;
      padding: 14px;
      margin-top: 8px;
      box-shadow: 0 8px 22px rgba(183, 132, 73, 0.12);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cliniva-proposal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 12.5px;
      color: ${config.primaryColor};
      border-bottom: 1px solid rgba(183, 132, 73, 0.22);
      padding-bottom: 8px;
    }

    .cliniva-proposal-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: ${config.textColor};
    }

    .cliniva-proposal-label {
      opacity: 0.65;
    }

    .cliniva-proposal-value {
      font-weight: 600;
      text-align: right;
    }

    .cliniva-consent-box {
      background: #FAF6F1;
      border: 1px solid rgba(183, 132, 73, 0.25);
      border-radius: 10px;
      padding: 9px 10px;
      font-size: 10.5px;
      color: #555;
      line-height: 1.4;
      margin-top: 4px;
    }

    .cliniva-consent-box label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }

    .cliniva-consent-box input[type="checkbox"] {
      margin-top: 2px;
      accent-color: ${config.primaryColor};
      cursor: pointer;
    }

    .cliniva-actions-row {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }

    .cliniva-btn-cancel {
      flex: 1;
      padding: 9px 12px;
      border-radius: 9999px;
      border: 1px solid #D1D5DB;
      background: #FFFFFF;
      font-size: 11.5px;
      font-weight: 600;
      color: #4B5563;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cliniva-btn-cancel:hover {
      background: #F3F4F6;
    }

    .cliniva-btn-confirm {
      flex: 1.4;
      padding: 9px 12px;
      border-radius: 9999px;
      border: none;
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%);
      color: #FAF6F1;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(104, 21, 45, 0.25);
    }

    .cliniva-btn-confirm:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .cliniva-btn-confirm:disabled {
      background: #9CA3AF;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.8;
    }

    .cliniva-success-card {
      background: #ECFDF5;
      border: 1px solid #10B981;
      color: #065F46;
      padding: 12px;
      border-radius: 14px;
      font-size: 11.5px;
      line-height: 1.45;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    }

    /* Animações */
    @keyframes clinivaWindowOpen {
      from {
        opacity: 0;
        transform: scale(0.94) translateY(14px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes clinivaFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes clinivaMsgIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes clinivaDotPulse {
      0%, 80%, 100% {
        transform: scale(0.7);
        opacity: 0.4;
      }
      40% {
        transform: scale(1.15);
        opacity: 1;
      }
    }

    /* 6. RESPONSIVIDADE MOBILE (< 640px) */
    @media (max-width: 640px) {
      #cliniva-chat-widget-root {
        bottom: 0 !important;
        right: 0 !important;
      }

      .cliniva-card-window {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        max-width: 100vw !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }

      .cliniva-header {
        padding-top: calc(14px + env(safe-area-inset-top, 0px));
        border-radius: 0 !important;
      }

      .cliniva-input-bar {
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }

    /* Acessibilidade */
    @media (prefers-reduced-motion: reduce) {
      .cliniva-card-window,
      .cliniva-btn-launcher,
      .cliniva-msg-row,
      .cliniva-dot,
      .cliniva-prompt-chip {
        animation: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // 5. Restauração e Persistência de Sessão
  function restoreSession() {
    try {
      var stored = sessionStorage.getItem(config.storageKey);
      if (stored) {
        var parsed = JSON.parse(stored);
        state.sessionId = parsed.sessionId;
        state.sessionToken = parsed.sessionToken;

        if (state.sessionId && state.sessionToken) {
          fetch(`${config.apiUrl}/api/public/chat/session?slug=${encodeURIComponent(config.slug)}&sessionId=${encodeURIComponent(state.sessionId)}&token=${encodeURIComponent(state.sessionToken)}`)
            .then(function (res) { return res.json(); })
            .then(function (data) {
              if (data && Array.isArray(data.messages) && data.messages.length > 0) {
                state.messages = data.messages;
                state.remainingMessages = data.remainingMessages ?? state.remainingMessages;
                if (data.activeProposal) {
                  state.pendingProposal = data.activeProposal;
                }
                render();
              }
            })
            .catch(function () {});
        }
      }
    } catch (e) {}

    // Mensagem de acolhimento inicial se não houver histórico
    if (state.messages.length === 0) {
      state.messages = [
        {
          role: "assistant",
          content: `Olá! Sou a assistente virtual de ${config.title === "Assistente Virtual" ? "atendimento" : config.title}. Seja muito bem-vindo(a)! Como posso ajudar você hoje com seus atendimentos ou agendamento de consultas?`,
          created_at: new Date().toISOString(),
        },
      ];
    }
  }

  function saveSession(sessionId, sessionToken) {
    state.sessionId = sessionId;
    state.sessionToken = sessionToken;
    try {
      sessionStorage.setItem(config.storageKey, JSON.stringify({ sessionId: sessionId, sessionToken: sessionToken }));
    } catch (e) {}
  }

  // 6. Envio de Mensagem para o Backend
  function sendMessage(text) {
    var msg = (text || "").trim();
    if (!msg || state.isLoading) return;

    state.errorMessage = null;
    state.messages.push({
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    });
    state.isLoading = true;
    render();
    scrollToBottom();

    var payload = {
      slug: config.slug,
      message: msg,
    };
    if (state.sessionId) {
      payload.sessionId = state.sessionId;
    }

    fetch(`${config.apiUrl}/api/public/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) { throw new Error(err.error || "Erro no atendimento."); });
        }
        return res.json();
      })
      .then(function (data) {
        state.isLoading = false;
        if (data.sessionId && data.sessionToken) {
          saveSession(data.sessionId, data.sessionToken);
        }
        state.remainingMessages = data.remainingMessages ?? state.remainingMessages;
        if (data.message) {
          state.messages.push({
            role: "assistant",
            content: data.message,
            created_at: new Date().toISOString(),
          });
        }
        if (data.proposal) {
          state.pendingProposal = data.proposal;
          state.consentChecked = false;
        }
        render();
        scrollToBottom();
      })
      .catch(function (err) {
        state.isLoading = false;
        state.errorMessage = err.message || "Não foi possível enviar a mensagem.";
        render();
        scrollToBottom();
      });
  }

  // 7. Confirmação Explícita de Agendamento
  function confirmAppointment() {
    if (!state.pendingProposal || !state.consentChecked || state.isConfirming) return;

    state.isConfirming = true;
    state.errorMessage = null;
    render();

    var proposal = state.pendingProposal;
    var payload = {
      slug: config.slug,
      sessionId: state.sessionId,
      proposalId: proposal.proposalId,
      scheduledStart: proposal.scheduledStart,
      scheduledEnd: proposal.scheduledEnd,
      fullName: proposal.fullName,
      whatsapp: proposal.whatsapp,
      notes: proposal.notes || "Agendamento solicitado via Cliniva Universal Chat Widget",
      idempotencyKey: generateIdempotencyKey(),
      consent: {
        accepted: true,
        version: "v2026.1-universal",
        timestamp: new Date().toISOString(),
      },
    };

    fetch(`${config.apiUrl}/api/public/chat/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.error || "Erro ao formalizar agendamento.");
          }
          return data;
        });
      })
      .then(function (data) {
        state.isConfirming = false;
        state.pendingProposal = null;
        state.completedAppointment = data;
        state.messages.push({
          role: "assistant",
          content: `Sua solicitação de agendamento foi registrada com sucesso sob o status "Aguardando Aprovação". A equipe entrará em contato em breve para formalização final.`,
          created_at: new Date().toISOString(),
        });
        render();
        scrollToBottom();
      })
      .catch(function (err) {
        state.isConfirming = false;
        state.errorMessage = err.message || "Falha na confirmação.";
        render();
        scrollToBottom();
      });
  }

  function cancelProposal() {
    state.pendingProposal = null;
    state.errorMessage = null;
    state.messages.push({
      role: "assistant",
      content: "Proposta cancelada. Se desejar verificar outro dia ou horário, basta me dizer!",
      created_at: new Date().toISOString(),
    });
    render();
    scrollToBottom();
  }

  // 8. Renderização da Interface
  function render() {
    if (!state.isOpen) {
      // Launcher Fechado
      var avatarContent = config.launcherImage || config.avatarUrl ? `
        <img class="cliniva-launcher-avatar-img" src="${escapeHtml(config.launcherImage || config.avatarUrl)}" alt="Avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="cliniva-launcher-avatar-fallback" style="display:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
            <path d="M4 11v2a8 8 0 0 0 16 0v-2"></path>
            <rect x="8" y="10" width="8" height="8" rx="2"></rect>
          </svg>
        </div>
      ` : `
        <div class="cliniva-launcher-avatar-fallback">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      `;

      container.innerHTML = `
        <button class="cliniva-btn-launcher" id="cliniva-trigger-open" aria-label="Abrir chat de atendimento">
          <div class="cliniva-launcher-avatar-wrap">
            ${avatarContent}
            <span class="cliniva-launcher-badge"></span>
          </div>
          <span>Fale com a Assistente</span>
        </button>
      `;

      var btnOpen = document.getElementById("cliniva-trigger-open");
      if (btnOpen) {
        btnOpen.onclick = function () {
          state.isOpen = true;
          state.isMinimized = false;
          render();
          scrollToBottom();
          focusInput();
        };
      }
      return;
    }

    // Janela Aberta
    var headerAvatar = config.avatarUrl || config.launcherImage ? `
      <img class="cliniva-header-avatar-img" src="${escapeHtml(config.avatarUrl || config.launcherImage)}" alt="Avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="cliniva-header-avatar-fallback" style="display:none;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
          <circle cx="12" cy="5" r="2"></circle>
          <path d="M12 7v4"></path>
        </svg>
      </div>
    ` : `
      <div class="cliniva-header-avatar-fallback">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
          <circle cx="12" cy="5" r="2"></circle>
          <path d="M12 7v4"></path>
        </svg>
      </div>
    `;

    var html = `
      <div class="cliniva-card-window ${state.isMinimized ? "minimized" : ""}">
        <!-- 1. CABEÇALHO -->
        <div class="cliniva-header">
          <div class="cliniva-header-left">
            <div class="cliniva-header-avatar-wrap">
              ${headerAvatar}
              <span class="cliniva-header-status-badge"></span>
            </div>
            <div class="cliniva-header-text">
              <div class="cliniva-header-title">${escapeHtml(config.title)}</div>
              <div class="cliniva-header-subtitle">
                <span class="cliniva-header-sub-dot"></span>
                <span>${escapeHtml(config.subtitle)}</span>
              </div>
            </div>
          </div>
          <div class="cliniva-header-actions">
            <button class="cliniva-header-btn" id="cliniva-btn-min" aria-label="${state.isMinimized ? "Expandir" : "Minimizar"}" title="${state.isMinimized ? "Expandir" : "Minimizar"}">
              ${state.isMinimized ? `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              ` : `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              `}
            </button>
            <button class="cliniva-header-btn" id="cliniva-btn-close" aria-label="Fechar chat" title="Fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
    `;

    if (!state.isMinimized) {
      // 2. CORPO DE MENSAGENS
      html += `
        <div class="cliniva-messages-box" id="cliniva-msg-box">
          ${state.errorMessage ? `
            <div class="cliniva-error-card">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>${escapeHtml(state.errorMessage)}</div>
            </div>
          ` : ""}

          ${state.messages.map(function (m) {
            var timeStr = formatTime(m.created_at);
            return `
              <div class="cliniva-msg-row ${m.role === "user" ? "user" : "assistant"}">
                <div class="cliniva-msg-bubble">${escapeHtml(m.content)}</div>
                ${timeStr ? `<div class="cliniva-msg-time">${timeStr}</div>` : ""}
              </div>
            `;
          }).join("")}

          ${state.isLoading ? `
            <div class="cliniva-typing-indicator">
              <span class="cliniva-typing-text">Assistente digitando</span>
              <div class="cliniva-dots-group">
                <span class="cliniva-dot"></span>
                <span class="cliniva-dot"></span>
                <span class="cliniva-dot"></span>
              </div>
            </div>
          ` : ""}

          <!-- CARD DE PROPOSTA DE AGENDAMENTO -->
          ${state.pendingProposal ? `
            <div class="cliniva-proposal-card">
              <div class="cliniva-proposal-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${config.accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Resumo da Solicitação</span>
              </div>
              <div class="cliniva-proposal-row">
                <span class="cliniva-proposal-label">Paciente:</span>
                <span class="cliniva-proposal-value">${escapeHtml(state.pendingProposal.fullName)}</span>
              </div>
              <div class="cliniva-proposal-row">
                <span class="cliniva-proposal-label">WhatsApp:</span>
                <span class="cliniva-proposal-value">${escapeHtml(state.pendingProposal.whatsapp)}</span>
              </div>
              <div class="cliniva-proposal-row">
                <span class="cliniva-proposal-label">Data e Horário:</span>
                <span class="cliniva-proposal-value" style="color:${config.primaryColor};">
                  ${escapeHtml(new Date(state.pendingProposal.scheduledStart).toLocaleDateString("pt-BR"))} às ${escapeHtml(new Date(state.pendingProposal.scheduledStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}
                </span>
              </div>

              <div class="cliniva-consent-box">
                <label>
                  <input type="checkbox" id="cliniva-consent-chk" ${state.consentChecked ? "checked" : ""}>
                  <span>Concordo com o envio dos dados para <strong>finalidade exclusiva</strong> de contato do consultório (LGPD). Compreendo que a solicitação fica <strong>aguardando aprovação</strong>.</span>
                </label>
              </div>

              <div class="cliniva-actions-row">
                <button type="button" class="cliniva-btn-cancel" id="cliniva-cancel-prop">Alterar / Cancelar</button>
                <button type="button" class="cliniva-btn-confirm" id="cliniva-confirm-prop" ${(!state.consentChecked || state.isConfirming) ? "disabled" : ""}>
                  ${state.isConfirming ? "Enviando..." : "Confirmar Solicitação"}
                </button>
              </div>
            </div>
          ` : ""}

          <!-- CARD DE SUCESSO -->
          ${state.completedAppointment ? `
            <div class="cliniva-success-card">
              <div style="font-weight:700; margin-bottom:2px;">✓ Solicitação de Agendamento Registrada!</div>
              <div>Status: <strong>Aguardando Aprovação</strong>. A recepção entrará em contato via WhatsApp para formalização final.</div>
            </div>
          ` : ""}
        </div>
      `;

      // 3. PERGUNTAS SUGERIDAS (Apenas no início da interação e sem proposta pendente)
      if (state.messages.length === 1 && !state.pendingProposal) {
        html += `
          <div class="cliniva-quick-prompts-wrapper">
            <div class="cliniva-quick-prompts-label">Sugestões de Perguntas:</div>
            <div class="cliniva-quick-prompts-chips">
              ${INITIAL_SUGGESTIONS.map(function (sug) {
                return `<button type="button" class="cliniva-prompt-chip" data-prompt="${escapeHtml(sug)}">${escapeHtml(sug)}</button>`;
              }).join("")}
            </div>
          </div>
        `;
      }

      // 4. CAMPO DE MENSAGEM (RODAPÉ FIXO)
      html += `
        <form class="cliniva-input-bar" id="cliniva-form-msg">
          <input 
            type="text" 
            class="cliniva-input-field" 
            id="cliniva-input-text" 
            placeholder="Digite sua mensagem..." 
            autocomplete="off"
            ${state.isLoading || state.isConfirming ? "disabled" : ""}
          >
          <button 
            type="submit" 
            class="cliniva-btn-send" 
            id="cliniva-btn-submit" 
            aria-label="Enviar mensagem"
            ${state.isLoading || state.isConfirming ? "disabled" : ""}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div class="cliniva-input-footnote">
          🔒 Atendimento protegido com privacidade e consentimento LGPD
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Vinculação dos Event Listeners
    var btnMin = document.getElementById("cliniva-btn-min");
    if (btnMin) {
      btnMin.onclick = function () {
        state.isMinimized = !state.isMinimized;
        render();
        if (!state.isMinimized) {
          scrollToBottom();
          focusInput();
        }
      };
    }

    var btnClose = document.getElementById("cliniva-btn-close");
    if (btnClose) {
      btnClose.onclick = function () {
        state.isOpen = false;
        render();
      };
    }

    var chkConsent = document.getElementById("cliniva-consent-chk");
    if (chkConsent) {
      chkConsent.onchange = function (e) {
        state.consentChecked = e.target.checked;
        var btnConfirm = document.getElementById("cliniva-confirm-prop");
        if (btnConfirm) btnConfirm.disabled = !state.consentChecked || state.isConfirming;
      };
    }

    var btnConfirm = document.getElementById("cliniva-confirm-prop");
    if (btnConfirm) {
      btnConfirm.onclick = function () {
        confirmAppointment();
      };
    }

    var btnCancel = document.getElementById("cliniva-cancel-prop");
    if (btnCancel) {
      btnCancel.onclick = function () {
        cancelProposal();
      };
    }

    var promptChips = container.querySelectorAll(".cliniva-prompt-chip");
    promptChips.forEach(function (chip) {
      chip.onclick = function () {
        var text = chip.getAttribute("data-prompt");
        sendMessage(text);
      };
    });

    var form = document.getElementById("cliniva-form-msg");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var inp = document.getElementById("cliniva-input-text");
        if (inp && inp.value.trim()) {
          sendMessage(inp.value.trim());
          inp.value = "";
        }
      };
    }
  }

  function focusInput() {
    setTimeout(function () {
      var inp = document.getElementById("cliniva-input-text");
      if (inp) inp.focus();
    }, 150);
  }

  function scrollToBottom() {
    setTimeout(function () {
      var box = document.getElementById("cliniva-msg-box");
      if (box) box.scrollTop = box.scrollHeight;
    }, 50);
  }

  // Inicialização
  restoreSession();
  render();
})();
