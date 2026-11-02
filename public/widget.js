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

  var rawSlug = (currentScript && (currentScript.getAttribute("data-slug") || currentScript.getAttribute("data-therapist"))) || "dra-cristiane";

  var config = {
    slug: rawSlug,
    apiUrl: ((currentScript && currentScript.getAttribute("data-api-url")) || "").replace(/\/$/, ""),
    primaryColor: (currentScript && currentScript.getAttribute("data-primary-color")) || "#68152D",
    accentColor: (currentScript && currentScript.getAttribute("data-accent-color")) || "#B78449",
    bgColor: (currentScript && currentScript.getAttribute("data-bg-color")) || "#FAF6F1",
    textColor: (currentScript && currentScript.getAttribute("data-text-color")) || "#342A2D",
    title: (currentScript && currentScript.getAttribute("data-title")) || "Assistente Virtual",
    subtitle: (currentScript && currentScript.getAttribute("data-subtitle")) || "Atendimento online",
    avatarUrl: (currentScript && (currentScript.getAttribute("data-avatar-url") || currentScript.getAttribute("data-launcher-image"))) || "",
    launcherImage: (currentScript && currentScript.getAttribute("data-launcher-image")) || "",
    storageKey: "cliniva_chat_session_" + rawSlug,
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

  // 4. Injeção de Estilos Scoped e Imunes a Resets Externos
  var style = document.createElement("style");
  style.id = "cliniva-chat-widget-styles";
  style.textContent = `
    #cliniva-chat-widget-root {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      line-height: 1.5 !important;
      letter-spacing: normal !important;
      box-sizing: border-box !important;
    }

    /* Reset scoped sem universal selector de baixa prioridade */
    #cliniva-chat-widget-root *,
    #cliniva-chat-widget-root *::before,
    #cliniva-chat-widget-root *::after {
      box-sizing: border-box !important;
    }

    /* Launcher Padrão Elegante com Avatar */
    #cliniva-chat-widget-root .cliniva-btn-launcher {
      display: inline-flex !important;
      align-items: center !important;
      gap: 12px !important;
      background: ${config.primaryColor} !important;
      color: #FAF6F1 !important;
      padding: 8px 20px 8px 10px !important;
      border-radius: 9999px !important;
      box-shadow: 0 14px 32px -6px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(104, 21, 45, 0.25) !important;
      border: 1.5px solid rgba(183, 132, 73, 0.5) !important;
      cursor: pointer !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      letter-spacing: 0.01em !important;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease !important;
      outline: none !important;
      user-select: none !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-launcher:hover {
      transform: scale(1.04) translateY(-2px) !important;
      box-shadow: 0 18px 36px -6px rgba(0, 0, 0, 0.42) !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-launcher:active {
      transform: scale(0.97) !important;
    }

    #cliniva-chat-widget-root .cliniva-launcher-avatar-wrap {
      position: relative !important;
      width: 36px !important;
      height: 36px !important;
      border-radius: 50% !important;
      overflow: hidden !important;
      border: 1.5px solid ${config.accentColor} !important;
      background: #470E20 !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    #cliniva-chat-widget-root .cliniva-launcher-avatar-img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }

    #cliniva-chat-widget-root .cliniva-launcher-avatar-fallback {
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #FAF6F1 !important;
    }

    #cliniva-chat-widget-root .cliniva-launcher-badge {
      position: absolute !important;
      bottom: -1px !important;
      right: -1px !important;
      width: 10px !important;
      height: 10px !important;
      background: #10B981 !important;
      border: 2px solid ${config.primaryColor} !important;
      border-radius: 50% !important;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.9) !important;
    }

    /* Janela do Chat Premium */
    #cliniva-chat-widget-root .cliniva-card-window {
      width: 410px !important;
      max-width: calc(100vw - 32px) !important;
      height: 610px !important;
      max-height: calc(100vh - 48px) !important;
      background-color: ${config.bgColor} !important;
      border-radius: 24px !important;
      box-shadow: 0 24px 54px -12px rgba(0, 0, 0, 0.3), 0 8px 24px -4px rgba(104, 21, 45, 0.15) !important;
      border: 1px solid rgba(183, 132, 73, 0.35) !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      animation: clinivaWindowOpen 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
      transform-origin: bottom right !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-card-window.minimized {
      height: 68px !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25) !important;
    }

    /* 1. CABEÇALHO */
    #cliniva-chat-widget-root .cliniva-header {
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%) !important;
      color: #FAF6F1 !important;
      padding: 14px 18px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-bottom: 1px solid rgba(183, 132, 73, 0.3) !important;
      user-select: none !important;
      flex-shrink: 0 !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      min-width: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-avatar-wrap {
      position: relative !important;
      width: 42px !important;
      height: 42px !important;
      border-radius: 50% !important;
      border: 2px solid ${config.accentColor} !important;
      background: #470E20 !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    }

    #cliniva-chat-widget-root .cliniva-header-avatar-img {
      width: 100% !important;
      height: 100% !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      display: block !important;
    }

    #cliniva-chat-widget-root .cliniva-header-avatar-fallback {
      width: 100% !important;
      height: 100% !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #FAF6F1 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-status-badge {
      position: absolute !important;
      bottom: 0 !important;
      right: 0 !important;
      width: 11px !important;
      height: 11px !important;
      background: #10B981 !important;
      border: 2px solid ${config.primaryColor} !important;
      border-radius: 50% !important;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.9) !important;
    }

    #cliniva-chat-widget-root .cliniva-header-text {
      min-width: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-title {
      font-weight: 700 !important;
      font-size: 15.5px !important;
      line-height: 1.3 !important;
      color: #FAF6F1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      letter-spacing: -0.01em !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-subtitle {
      font-size: 12px !important;
      line-height: 1.3 !important;
      color: #EED9CF !important;
      opacity: 0.92 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin-top: 2px !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-sub-dot {
      width: 6.5px !important;
      height: 6.5px !important;
      background: #10B981 !important;
      border-radius: 50% !important;
      display: inline-block !important;
      flex-shrink: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-actions {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    #cliniva-chat-widget-root .cliniva-header-btn {
      background: transparent !important;
      border: none !important;
      color: #FAF6F1 !important;
      opacity: 0.85 !important;
      cursor: pointer !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-header-btn:hover {
      opacity: 1 !important;
      background: rgba(255, 255, 255, 0.16) !important;
      transform: scale(1.05) !important;
    }

    /* 2. ÁREA DE MENSAGENS COM SCROLL INTELIGENTE */
    #cliniva-chat-widget-root .cliniva-messages-box {
      flex: 1 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: 16px 18px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 14px !important;
      margin: 0 !important;
      background: transparent !important;
      -webkit-overflow-scrolling: touch !important;
    }

    #cliniva-chat-widget-root .cliniva-messages-box::-webkit-scrollbar {
      width: 5px !important;
    }
    #cliniva-chat-widget-root .cliniva-messages-box::-webkit-scrollbar-track {
      background: transparent !important;
    }
    #cliniva-chat-widget-root .cliniva-messages-box::-webkit-scrollbar-thumb {
      background: rgba(183, 132, 73, 0.3) !important;
      border-radius: 9999px !important;
    }

    /* BALÕES DE MENSAGENS */
    #cliniva-chat-widget-root .cliniva-msg-row {
      display: flex !important;
      flex-direction: column !important;
      max-width: 88% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.new-anim {
      animation: clinivaMsgIn 0.2s ease-out !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.assistant {
      align-self: flex-start !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.user {
      align-self: flex-end !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-bubble {
      padding: 12px 16px !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      letter-spacing: -0.01em !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.assistant .cliniva-msg-bubble {
      background: #FFFFFF !important;
      color: ${config.textColor} !important;
      border: 1px solid rgba(183, 132, 73, 0.25) !important;
      border-radius: 18px 18px 18px 4px !important;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05) !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.user .cliniva-msg-bubble {
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%) !important;
      color: #FAF6F1 !important;
      border-radius: 18px 18px 4px 18px !important;
      border: none !important;
      box-shadow: 0 4px 14px rgba(104, 21, 45, 0.25) !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-time {
      font-size: 11px !important;
      line-height: 1.2 !important;
      margin-top: 5px !important;
      opacity: 0.7 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.assistant .cliniva-msg-time {
      margin-left: 6px !important;
      color: #666666 !important;
    }

    #cliniva-chat-widget-root .cliniva-msg-row.user .cliniva-msg-time {
      margin-right: 6px !important;
      align-self: flex-end !important;
      color: #777777 !important;
    }

    /* 3. PERGUNTAS SUGERIDAS (CHIPS ELEGANTES) */
    #cliniva-chat-widget-root .cliniva-quick-prompts-wrapper {
      padding: 2px 2px 4px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      flex-shrink: 0 !important;
      animation: clinivaFadeIn 0.25s ease-out !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-quick-prompts-label {
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.07em !important;
      color: ${config.accentColor} !important;
      margin-bottom: 2px !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-quick-prompts-chips {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-prompt-chip {
      background: #FFFFFF !important;
      border: 1.5px solid rgba(183, 132, 73, 0.35) !important;
      border-radius: 12px !important;
      padding: 9px 14px !important;
      font-size: 13px !important;
      color: ${config.textColor} !important;
      cursor: pointer !important;
      text-align: left !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
      user-select: none !important;
      line-height: 1.45 !important;
      outline: none !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-prompt-chip:hover {
      border-color: ${config.primaryColor} !important;
      background: #FFF7F2 !important;
      color: ${config.primaryColor} !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(104, 21, 45, 0.1) !important;
    }

    /* 4. CAMPO DE MENSAGEM & RODAPÉ */
    #cliniva-chat-widget-root .cliniva-input-bar {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 12px 18px !important;
      border-top: 1px solid rgba(183, 132, 73, 0.2) !important;
      background: #FFFFFF !important;
      flex-shrink: 0 !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-input-field {
      flex: 1 !important;
      border: 1.5px solid rgba(183, 132, 73, 0.35) !important;
      border-radius: 9999px !important;
      padding: 10px 18px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      height: 44px !important;
      outline: none !important;
      background: #FAF6F1 !important;
      color: ${config.textColor} !important;
      transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-input-field:focus {
      border-color: ${config.primaryColor} !important;
      background: #FFFFFF !important;
      box-shadow: 0 0 0 3px rgba(104, 21, 45, 0.12) !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-send {
      background: ${config.primaryColor} !important;
      color: #FAF6F1 !important;
      border: none !important;
      border-radius: 50% !important;
      width: 42px !important;
      height: 42px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: transform 0.2s ease, background-color 0.2s, opacity 0.2s !important;
      flex-shrink: 0 !important;
      box-shadow: 0 4px 12px rgba(104, 21, 45, 0.22) !important;
      outline: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-send:hover:not(:disabled) {
      transform: scale(1.06) !important;
      background: #470E20 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-send:disabled {
      background: #D1D5DB !important;
      color: #9CA3AF !important;
      box-shadow: none !important;
      cursor: not-allowed !important;
      opacity: 0.7 !important;
    }

    #cliniva-chat-widget-root .cliniva-input-footnote {
      font-size: 10.5px !important;
      color: #888888 !important;
      text-align: center !important;
      padding: 0 16px 8px !important;
      background: #FFFFFF !important;
      flex-shrink: 0 !important;
      margin: 0 !important;
      user-select: none !important;
    }

    /* 5. EXPERIÊNCIA VISUAL: INDICADORES E CARDS */
    #cliniva-chat-widget-root .cliniva-typing-indicator {
      align-self: flex-start !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 10px 16px !important;
      background: #FFFFFF !important;
      border-radius: 18px 18px 18px 4px !important;
      border: 1px solid rgba(183, 132, 73, 0.25) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-typing-text {
      font-size: 12.5px !important;
      color: #666666 !important;
      margin-right: 4px !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-dots-group {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-dot {
      width: 6px !important;
      height: 6px !important;
      background: ${config.primaryColor} !important;
      border-radius: 50% !important;
      animation: clinivaDotPulse 1.2s infinite ease-in-out !important;
      display: inline-block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #cliniva-chat-widget-root .cliniva-dot:nth-child(2) { animation-delay: 0.2s !important; }
    #cliniva-chat-widget-root .cliniva-dot:nth-child(3) { animation-delay: 0.4s !important; }

    #cliniva-chat-widget-root .cliniva-error-card {
      background: #FEE2E2 !important;
      border: 1px solid #FCA5A5 !important;
      color: #991B1B !important;
      padding: 12px 16px !important;
      border-radius: 14px !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: flex-start !important;
      gap: 10px !important;
      line-height: 1.45 !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-proposal-card {
      background: #FFFFFF !important;
      border: 2px solid ${config.accentColor} !important;
      border-radius: 16px !important;
      padding: 16px !important;
      margin-top: 6px !important;
      box-shadow: 0 8px 24px rgba(183, 132, 73, 0.14) !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }

    #cliniva-chat-widget-root .cliniva-proposal-header {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      color: ${config.primaryColor} !important;
      border-bottom: 1px solid rgba(183, 132, 73, 0.22) !important;
      padding-bottom: 10px !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-proposal-row {
      display: flex !important;
      justify-content: space-between !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      color: ${config.textColor} !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-proposal-label {
      opacity: 0.7 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-proposal-value {
      font-weight: 600 !important;
      text-align: right !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-consent-box {
      background: #FAF6F1 !important;
      border: 1px solid rgba(183, 132, 73, 0.3) !important;
      border-radius: 10px !important;
      padding: 10px 12px !important;
      font-size: 12px !important;
      color: #555555 !important;
      line-height: 1.45 !important;
      margin-top: 6px !important;
    }

    #cliniva-chat-widget-root .cliniva-consent-box label {
      display: flex !important;
      align-items: flex-start !important;
      gap: 8px !important;
      cursor: pointer !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-consent-box input[type="checkbox"] {
      margin-top: 2px !important;
      accent-color: ${config.primaryColor} !important;
      cursor: pointer !important;
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-actions-row {
      display: flex !important;
      gap: 8px !important;
      margin-top: 8px !important;
      padding: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-cancel {
      flex: 1 !important;
      padding: 10px 14px !important;
      border-radius: 9999px !important;
      border: 1.5px solid #D1D5DB !important;
      background: #FFFFFF !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      color: #4B5563 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      text-align: center !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-cancel:hover {
      background: #F3F4F6 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-confirm {
      flex: 1.4 !important;
      padding: 10px 14px !important;
      border-radius: 9999px !important;
      border: none !important;
      background: linear-gradient(135deg, ${config.primaryColor} 0%, #470E20 100%) !important;
      color: #FAF6F1 !important;
      font-size: 12.5px !important;
      font-weight: 700 !important;
      letter-spacing: 0.02em !important;
      text-transform: uppercase !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 4px 12px rgba(104, 21, 45, 0.25) !important;
      outline: none !important;
      text-align: center !important;
      margin: 0 !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-confirm:hover:not(:disabled) {
      filter: brightness(1.1) !important;
      transform: translateY(-1px) !important;
    }

    #cliniva-chat-widget-root .cliniva-btn-confirm:disabled {
      background: #9CA3AF !important;
      box-shadow: none !important;
      cursor: not-allowed !important;
      opacity: 0.8 !important;
    }

    #cliniva-chat-widget-root .cliniva-success-card {
      background: #ECFDF5 !important;
      border: 1px solid #10B981 !important;
      color: #065F46 !important;
      padding: 14px !important;
      border-radius: 14px !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1) !important;
      margin: 0 !important;
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

      #cliniva-chat-widget-root .cliniva-card-window {
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

      #cliniva-chat-widget-root .cliniva-header {
        padding-top: calc(14px + env(safe-area-inset-top, 0px)) !important;
        border-radius: 0 !important;
      }

      #cliniva-chat-widget-root .cliniva-input-bar {
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
      }
    }

    /* Acessibilidade */
    @media (prefers-reduced-motion: reduce) {
      #cliniva-chat-widget-root .cliniva-card-window,
      #cliniva-chat-widget-root .cliniva-btn-launcher,
      #cliniva-chat-widget-root .cliniva-msg-row,
      #cliniva-chat-widget-root .cliniva-dot,
      #cliniva-chat-widget-root .cliniva-prompt-chip {
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
    render(true);

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
      })
      .catch(function (err) {
        state.isLoading = false;
        state.errorMessage = err.message || "Não foi possível enviar a mensagem.";
        render();
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
        render(true);
      })
      .catch(function (err) {
        state.isConfirming = false;
        state.errorMessage = err.message || "Falha na confirmação.";
        render(true);
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
    render(true);
  }

  // 8. Renderização da Interface
  function renderMessagesContent() {
    var content = "";

    if (state.errorMessage) {
      content += `
        <div class="cliniva-error-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>${escapeHtml(state.errorMessage)}</div>
        </div>
      `;
    }

    content += state.messages.map(function (m, idx) {
      var timeStr = formatTime(m.created_at);
      var isLast = idx === state.messages.length - 1;
      return `
        <div class="cliniva-msg-row ${m.role === "user" ? "user" : "assistant"} ${isLast ? "new-anim" : ""}">
          <div class="cliniva-msg-bubble">${escapeHtml(m.content)}</div>
          ${timeStr ? `<div class="cliniva-msg-time">${timeStr}</div>` : ""}
        </div>
      `;
    }).join("");

    if (state.isLoading) {
      content += `
        <div class="cliniva-typing-indicator new-anim">
          <span class="cliniva-typing-text">Assistente digitando</span>
          <div class="cliniva-dots-group">
            <span class="cliniva-dot"></span>
            <span class="cliniva-dot"></span>
            <span class="cliniva-dot"></span>
          </div>
        </div>
      `;
    }

    if (state.pendingProposal) {
      content += `
        <div class="cliniva-proposal-card new-anim">
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
      `;
    }

    if (state.completedAppointment) {
      content += `
        <div class="cliniva-success-card new-anim">
          <div style="font-weight:700; margin-bottom:2px;">✓ Solicitação de Agendamento Registrada!</div>
          <div>Status: <strong>Aguardando Aprovação</strong>. A recepção entrará em contato via WhatsApp para formalização final.</div>
        </div>
      `;
    }

    if (state.messages.length === 1 && !state.pendingProposal && !state.isLoading) {
      content += `
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

    return content;
  }

  function attachProposalListeners() {
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
  }

  function render(forceScroll) {
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
          render(true);
          focusInput();
        };
      }
      return;
    }

    var existingBox = document.getElementById("cliniva-msg-box");
    var existingCard = container.querySelector(".cliniva-card-window");

    // Otimização: se o card já existe e o estado de minimização não mudou, atualiza apenas o conteúdo de mensagens e inputs
    if (existingBox && existingCard && !existingCard.classList.contains("minimized") && !state.isMinimized) {
      var isNearBottom = (existingBox.scrollHeight - existingBox.scrollTop - existingBox.clientHeight) <= 120;
      existingBox.innerHTML = renderMessagesContent();
      attachProposalListeners();

      var inp = document.getElementById("cliniva-input-text");
      var btnSubmit = document.getElementById("cliniva-btn-submit");
      if (inp) inp.disabled = state.isLoading || state.isConfirming;
      if (btnSubmit) btnSubmit.disabled = state.isLoading || state.isConfirming;

      if (forceScroll || isNearBottom) {
        scrollToBottom();
      }
      return;
    }

    // Janela Aberta (Renderização completa da casca)
    var headerAvatar = (config.avatarUrl || config.launcherImage) ? `
      <img class="cliniva-header-avatar-img" src="${escapeHtml(config.avatarUrl || config.launcherImage)}" alt="Avatar" onerror="this.remove(); document.getElementById('cliniva-hdr-fallback') && (document.getElementById('cliniva-hdr-fallback').style.display='flex');" />
      <div id="cliniva-hdr-fallback" class="cliniva-header-avatar-fallback" style="display:none;">
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
          ${renderMessagesContent()}
        </div>
      `;

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

    // Vinculação dos Event Listeners do Header
    var btnMin = document.getElementById("cliniva-btn-min");
    if (btnMin) {
      btnMin.onclick = function () {
        state.isMinimized = !state.isMinimized;
        render(true);
        if (!state.isMinimized) {
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

    attachProposalListeners();

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

    scrollToBottom();
  }

  function focusInput() {
    setTimeout(function () {
      var inp = document.getElementById("cliniva-input-text");
      if (inp) inp.focus();
    }, 150);
  }

  function scrollToBottom(force) {
    var box = document.getElementById("cliniva-msg-box");
    if (!box) return;
    var isNearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) <= 120;
    if (force || isNearBottom) {
      box.scrollTop = box.scrollHeight;
    }
  }

  // Inicialização
  restoreSession();
  render();
})();
