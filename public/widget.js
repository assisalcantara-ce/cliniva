/**
 * Cliniva Universal Chat Widget (Embed Script) v1.0
 * 
 * Widget de agendamento conversacional com IA nativo do Cliniva.
 * Auto-contido, sem bibliotecas externas, isolado via Shadow DOM ou Scoped Elements,
 * responsivo, acessível e protegido contra XSS.
 * 
 * Uso:
 * <script 
 *   src="https://cliniva.app/widget.js" 
 *   data-slug="dra-cristiane" 
 *   data-api-url="https://cliniva.app"
 *   data-primary-color="#68152D"
 *   data-accent-color="#B78449"
 *   data-title="Dra. Cristiane Alcântara"
 *   data-subtitle="Assistente Virtual de Atendimento"
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
    bgColor: "#FAF6F1",
    textColor: "#342A2D",
    title: (currentScript && currentScript.getAttribute("data-title")) || "Assistente Virtual",
    subtitle: (currentScript && currentScript.getAttribute("data-subtitle")) || "Atendimento e Agendamento",
    storageKey: "cliniva_chat_session_" + ((currentScript && currentScript.getAttribute("data-slug")) || "default"),
  };

  // Se apiUrl não for definida, assume a mesma origem do script ou origin atual
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

  // Função utilitária de sanitização contra XSS
  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Gera chave aleatória de idempotência
  function generateIdempotencyKey() {
    return "idemp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 12);
  }

  // 3. Criação do Contêiner do Widget
  var container = document.createElement("div");
  container.id = "cliniva-chat-widget-root";
  container.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;";
  document.body.appendChild(container);

  // Injeção de CSS Scoped
  var style = document.createElement("style");
  style.textContent = `
    #cliniva-chat-widget-root * { box-sizing: border-box; margin: 0; padding: 0; }
    .cliniva-btn-launcher {
      display: flex; align-items: center; gap: 10px;
      background-color: ${config.primaryColor}; color: #FAF6F1;
      padding: 12px 20px; border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      border: 1px solid rgba(183, 132, 73, 0.4);
      cursor: pointer; transition: transform 0.2s, background-color 0.2s;
      font-weight: 600; font-size: 13px;
    }
    .cliniva-btn-launcher:hover { transform: scale(1.04); }
    .cliniva-card-window {
      width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(85vh);
      background-color: ${config.bgColor}; border-radius: 20px;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
      border: 1px solid rgba(183, 132, 73, 0.3);
      overflow: hidden; display: flex; flex-direction: column;
      animation: clinivaFadeIn 0.25s ease-out;
    }
    .cliniva-card-window.minimized { height: 60px; }
    .cliniva-header {
      background-color: ${config.primaryColor}; color: #FAF6F1;
      padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(183, 132, 73, 0.25);
    }
    .cliniva-header-title { font-weight: bold; font-size: 14px; line-height: 1.2; }
    .cliniva-header-sub { font-size: 10px; opacity: 0.85; }
    .cliniva-header-actions button {
      background: none; border: none; color: #FAF6F1; opacity: 0.8;
      cursor: pointer; padding: 4px 8px; border-radius: 9999px; font-size: 14px;
    }
    .cliniva-header-actions button:hover { opacity: 1; background: rgba(255,255,255,0.15); }
    .cliniva-messages-box {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .cliniva-msg {
      max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 12px; line-height: 1.45;
    }
    .cliniva-msg.user {
      align-self: flex-end; background-color: ${config.primaryColor}; color: #FAF6F1;
      border-bottom-right-radius: 2px;
    }
    .cliniva-msg.assistant {
      align-self: flex-start; background-color: #FFFFFF; color: ${config.textColor};
      border: 1px solid rgba(183, 132, 73, 0.2); border-bottom-left-radius: 2px;
      white-space: pre-wrap;
    }
    .cliniva-typing-indicator {
      align-self: flex-start; display: flex; align-items: center; gap: 4px;
      padding: 8px 14px; background: #fff; border-radius: 14px; border: 1px solid rgba(183, 132, 73, 0.2);
    }
    .cliniva-dot {
      width: 5px; height: 5px; background: ${config.primaryColor}; border-radius: 50%;
      animation: clinivaBounce 1s infinite;
    }
    .cliniva-dot:nth-child(2) { animation-delay: 0.2s; }
    .cliniva-dot:nth-child(3) { animation-delay: 0.4s; }
    .cliniva-proposal-card {
      background: #FFFFFF; border: 2px solid rgba(183, 132, 73, 0.4);
      border-radius: 14px; padding: 12px; margin-top: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .cliniva-proposal-title {
      font-weight: bold; font-size: 12px; color: ${config.primaryColor};
      border-bottom: 1px solid rgba(183, 132, 73, 0.2); padding-bottom: 6px; margin-bottom: 8px;
    }
    .cliniva-proposal-row {
      display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: ${config.textColor};
    }
    .cliniva-consent-box {
      background: #FAF6F1; border: 1px solid rgba(183, 132, 73, 0.25);
      border-radius: 8px; padding: 8px; font-size: 10px; margin: 8px 0; color: #555; line-height: 1.35;
    }
    .cliniva-actions-row { display: flex; gap: 8px; margin-top: 8px; }
    .cliniva-btn-cancel {
      flex: 1; padding: 8px; border-radius: 9999px; border: 1px solid #ccc; background: #fff;
      font-size: 11px; font-weight: 600; color: #666; cursor: pointer;
    }
    .cliniva-btn-confirm {
      flex: 1; padding: 8px; border-radius: 9999px; border: none; background: ${config.primaryColor};
      color: #FAF6F1; font-size: 11px; font-weight: bold; text-transform: uppercase; cursor: pointer;
    }
    .cliniva-btn-confirm:disabled { background: #bbb; cursor: not-allowed; }
    .cliniva-input-bar {
      display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid rgba(183, 132, 73, 0.2);
      background: #FFFFFF;
    }
    .cliniva-input {
      flex: 1; border: 1px solid rgba(183, 132, 73, 0.3); border-radius: 9999px;
      padding: 8px 14px; font-size: 12px; outline: none; background: #FAF6F1; color: ${config.textColor};
    }
    .cliniva-input:focus { border-color: ${config.primaryColor}; }
    .cliniva-btn-send {
      background: ${config.primaryColor}; color: #fff; border: none; border-radius: 9999px;
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    .cliniva-btn-send:disabled { background: #ccc; cursor: not-allowed; }
    .cliniva-quick-prompts { display: flex; flex-direction: column; gap: 6px; padding: 0 14px 10px; }
    .cliniva-prompt-chip {
      background: #fff; border: 1px solid rgba(183, 132, 73, 0.25); border-radius: 12px;
      padding: 6px 10px; font-size: 11px; color: ${config.textColor}; cursor: pointer; text-align: left;
    }
    .cliniva-prompt-chip:hover { border-color: ${config.primaryColor}; background: #FFF8F4; }
    @keyframes clinivaFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes clinivaBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  `;
  document.head.appendChild(style);

  // 4. Carregamento e Restauração de Sessão Segura
  function restoreSession() {
    try {
      var stored = sessionStorage.getItem(config.storageKey);
      if (stored) {
        var parsed = JSON.parse(stored);
        state.sessionId = parsed.sessionId;
        state.sessionToken = parsed.sessionToken;

        // Recupera histórico no backend Cliniva
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

    // Mensagem padrão inicial de boas-vindas se não houver histórico
    if (state.messages.length === 0) {
      state.messages = [
        {
          role: "assistant",
          content: `Olá! Sou a assistente virtual de ${config.title}. Como posso ajudar você hoje com dúvidas sobre o atendimento ou agendamento de consultas?`,
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

  // 5. Envio de Mensagem para o Backend Universal
  function sendMessage(text) {
    var msg = (text || "").trim();
    if (!msg || state.isLoading) return;

    state.errorMessage = null;
    state.messages.push({ role: "user", content: msg });
    state.isLoading = true;
    render();

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
          state.messages.push({ role: "assistant", content: data.message });
        }
        if (data.proposal) {
          state.pendingProposal = data.proposal;
          state.consentChecked = false; // Checkbox LGPD inicialmente desmarcado
        }
        render();
      })
      .catch(function (err) {
        state.isLoading = false;
        state.errorMessage = err.message || "Não foi possível enviar a mensagem.";
        render();
      });
  }

  // 6. Confirmação Explícita da Proposta de Agendamento
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
          content: `Sua solicitação de agendamento foi registrada com sucesso sob o status "Aguardando Aprovação". A equipe entrará em contato em breve para confirmação final.`,
        });
        render();
      })
      .catch(function (err) {
        state.isConfirming = false;
        state.errorMessage = err.message || "Falha na confirmação.";
        render();
      });
  }

  function cancelProposal() {
    state.pendingProposal = null;
    state.errorMessage = null;
    state.messages.push({
      role: "assistant",
      content: "Proposta cancelada. Se desejar verificar outro dia ou horário, basta me dizer!",
    });
    render();
  }

  // 7. Renderização da Interface
  function render() {
    if (!state.isOpen) {
      container.innerHTML = `
        <button class="cliniva-btn-launcher" id="cliniva-trigger-open" aria-label="Abrir chat de atendimento">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
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
        };
      }
      return;
    }

    var html = `
      <div class="cliniva-card-window ${state.isMinimized ? "minimized" : ""}">
        <div class="cliniva-header">
          <div>
            <div class="cliniva-header-title">${escapeHtml(config.title)}</div>
            <div class="cliniva-header-sub">${escapeHtml(config.subtitle)}</div>
          </div>
          <div class="cliniva-header-actions">
            <button id="cliniva-btn-min" aria-label="${state.isMinimized ? "Expandir" : "Minimizar"}">${state.isMinimized ? "▲" : "━"}</button>
            <button id="cliniva-btn-close" aria-label="Fechar">✕</button>
          </div>
        </div>
    `;

    if (!state.isMinimized) {
      html += `
        <div class="cliniva-messages-box" id="cliniva-msg-box">
          ${state.errorMessage ? `
            <div style="background:#FEE2E2; color:#991B1B; padding:8px 12px; border-radius:10px; font-size:11px;">
              ${escapeHtml(state.errorMessage)}
            </div>
          ` : ""}

          ${state.messages.map(function (m) {
            return `
              <div class="cliniva-msg ${m.role === "user" ? "user" : "assistant"}">
                ${escapeHtml(m.content)}
              </div>
            `;
          }).join("")}

          ${state.isLoading ? `
            <div class="cliniva-typing-indicator">
              <span class="cliniva-dot"></span>
              <span class="cliniva-dot"></span>
              <span class="cliniva-dot"></span>
            </div>
          ` : ""}

          ${state.pendingProposal ? `
            <div class="cliniva-proposal-card">
              <div class="cliniva-proposal-title">Resumo da Solicitação</div>
              <div class="cliniva-proposal-row">
                <span style="opacity:0.6;">Paciente:</span>
                <strong>${escapeHtml(state.pendingProposal.fullName)}</strong>
              </div>
              <div class="cliniva-proposal-row">
                <span style="opacity:0.6;">WhatsApp:</span>
                <strong>${escapeHtml(state.pendingProposal.whatsapp)}</strong>
              </div>
              <div class="cliniva-proposal-row">
                <span style="opacity:0.6;">Horário Escolhido:</span>
                <strong style="color:${config.primaryColor};">${escapeHtml(new Date(state.pendingProposal.scheduledStart).toLocaleDateString("pt-BR"))} às ${escapeHtml(new Date(state.pendingProposal.scheduledStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}</strong>
              </div>

              <div class="cliniva-consent-box">
                <label style="display:flex; align-items:flex-start; gap:6px; cursor:pointer;">
                  <input type="checkbox" id="cliniva-consent-chk" ${state.consentChecked ? "checked" : ""} style="margin-top:2px;">
                  <span>Concordo com o envio dos dados para finalidade exclusiva de contato do consultório (LGPD). Compreendo que a solicitação fica <strong>aguardando aprovação</strong>.</span>
                </label>
              </div>

              <div class="cliniva-actions-row">
                <button type="button" class="cliniva-btn-cancel" id="cliniva-cancel-prop">Alterar</button>
                <button type="button" class="cliniva-btn-confirm" id="cliniva-confirm-prop" ${(!state.consentChecked || state.isConfirming) ? "disabled" : ""}>
                  ${state.isConfirming ? "Enviando..." : "Confirmar Solicitação"}
                </button>
              </div>
            </div>
          ` : ""}

          ${state.completedAppointment ? `
            <div style="background:#ECFDF5; border:1px solid #A7F3D0; color:#065F46; padding:10px; border-radius:12px; font-size:11px;">
              <strong>✓ Solicitação Enviada!</strong><br/>
              Status: <strong>Aguardando Aprovação</strong>. A recepção entrará em contato via WhatsApp para formalização final.
            </div>
          ` : ""}
        </div>
      `;

      if (state.messages.length === 1 && !state.pendingProposal) {
        html += `
          <div class="cliniva-quick-prompts">
            <button class="cliniva-prompt-chip" data-prompt="Quais são os horários disponíveis esta semana?">📅 Quais os horários livres esta semana?</button>
            <button class="cliniva-prompt-chip" data-prompt="Como funciona o atendimento presencial e online?">💻 Como funciona o atendimento presencial e online?</button>
          </div>
        `;
      }

      html += `
        <form class="cliniva-input-bar" id="cliniva-form-msg">
          <input type="text" class="cliniva-input" id="cliniva-input-text" placeholder="Digite sua mensagem..." autocomplete="off">
          <button type="submit" class="cliniva-btn-send" id="cliniva-btn-submit" aria-label="Enviar mensagem">
            ➤
          </button>
        </form>
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
