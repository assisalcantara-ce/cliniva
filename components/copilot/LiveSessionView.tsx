"use client";

import React, { useState } from "react";
import { LiveSessionHeader } from "./LiveSessionHeader";
import { LiveTranscriptPanel } from "./LiveTranscriptPanel";
import { CopilotFeedPanel } from "./CopilotFeedPanel";
import { PatientContextDrawer } from "./PatientContextDrawer";
import type { ConnectionState, RealtimeTranscriptItem, CopilotEventItem } from "./useCopilotStream";
import type { CopilotAudioOverallState } from "./useCopilotAudio";

export interface LiveSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  streamState: ConnectionState;
  startTime?: Date | null;
  transcripts: RealtimeTranscriptItem[];
  events: CopilotEventItem[];
  interimTranscript?: string | null;
  captureEnabled?: boolean;
  audioState?: CopilotAudioOverallState;
  onStartCapture?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
  onDismissEvent: (eventId: string) => void;
  onTogglePinEvent?: (eventId: string) => void;
  onBack?: () => void;
  onAddQuickNote?: (note: string) => void;
  onBookmarkTopic?: () => void;
}

// ---------------------------------------------------------------------------
// AudioLevelMeter — medidor de amplitude real via Web Audio API
// ---------------------------------------------------------------------------
function AudioLevelMeter({
  captureEnabled,
  isPaused,
}: {
  captureEnabled: boolean;
  isPaused: boolean;
}) {
  const [bars, setBars] = React.useState<number[]>([4, 4, 4, 4, 4, 4, 4, 4]);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    if (!captureEnabled || isPaused) {
      setBars([4, 4, 4, 4, 4, 4, 4, 4]);
      return;
    }

    let active = true;

    async function setup() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some((d) => d.kind === "audioinput");
        if (!hasMic || !active) return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          if (!active || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const newBars = Array.from({ length: 8 }, (_, i) => {
            const idx = Math.floor((i / 8) * data.length);
            const val = data[idx] ?? 0;
            return Math.max(2, Math.round((val / 255) * 24));
          });
          setBars(newBars);
          rafRef.current = requestAnimationFrame(tick);
        }
        tick();
      } catch {
        // Sem microfone — mantém barras estáticas
      }
    }

    void setup();

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      analyserRef.current = null;
      streamRef.current = null;
    };
  }, [captureEnabled, isPaused]);

  if (!captureEnabled || isPaused) {
    return (
      <div className="flex items-center gap-0.5 h-4 ml-1">
        {[3, 4, 3, 4, 3, 4, 3, 4].map((h, i) => (
          <span key={i} className="w-0.5 rounded-full bg-slate-300" style={{ height: `${h}px` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 h-6 ml-1">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-teal-500 transition-all duration-75"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopilotStatusBadge — badge de status real do Copilot
// ---------------------------------------------------------------------------
function CopilotStatusBadge({
  captureEnabled,
  audioState,
}: {
  captureEnabled: boolean;
  audioState: CopilotAudioOverallState | undefined;
}) {
  if (!captureEnabled || !audioState || audioState === "idle" || audioState === "ended") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        <span className="text-xs font-bold text-slate-800">Copilot em espera</span>
      </div>
    );
  }

  if (audioState === "connecting" || audioState === "reconnecting") {
    return (
      <div className="flex items-center gap-1.5">
        <svg
          className="h-3.5 w-3.5 text-amber-500 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-xs font-bold text-slate-800">Conectando...</span>
      </div>
    );
  }

  if (audioState === "listening" || audioState === "transcribing" || audioState === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-800">Copilot ouvindo</span>
      </div>
    );
  }

  if (audioState === "paused") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-xs font-bold text-slate-800">Copilot pausado</span>
      </div>
    );
  }

  if (audioState === "error") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        <span className="text-xs font-bold text-slate-800">Erro na conexão</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      <span className="text-xs font-bold text-slate-800">Sessão encerrada</span>
    </div>
  );
}

export function LiveSessionView({
  sessionId,
  patientName,
  patientMemory,
  lastSessionDate,
  streamState,
  startTime,
  transcripts,
  events,
  interimTranscript,
  captureEnabled = false,
  audioState,
  onStartCapture,
  onPause,
  onResume,
  onEndSession,
  onDismissEvent,
  onBack,
  onAddQuickNote,
  onBookmarkTopic,
}: LiveSessionViewProps) {
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [topicMarkedToast, setTopicMarkedToast] = useState(false);

  const isPaused = streamState === "paused";

  // Determine mic button color based on audioState
  const micButtonClass = (() => {
    if (!captureEnabled) return "";
    if (audioState === "connecting" || audioState === "reconnecting") {
      return "bg-amber-100 text-amber-700 hover:bg-amber-200 ring-2 ring-amber-200/40";
    }
    if (audioState === "error") {
      return "bg-rose-100 text-rose-700 hover:bg-rose-200 ring-2 ring-rose-200/40";
    }
    if (isPaused || audioState === "paused") {
      return "bg-slate-100 text-slate-500 hover:bg-slate-200";
    }
    // listening / transcribing / connected
    return "bg-teal-100/90 text-teal-800 hover:bg-teal-200 ring-2 ring-teal-200/40";
  })();

  const handleTogglePause = () => {
    if (isPaused) {
      onResume?.();
    } else {
      onPause?.();
    }
  };

  const handleMarkTopic = () => {
    onBookmarkTopic?.();
    setTopicMarkedToast(true);
    setTimeout(() => setTopicMarkedToast(false), 2500);
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;
    onAddQuickNote?.(quickNoteText.trim());
    setQuickNoteText("");
    setQuickNoteOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#F8FAFC] overflow-hidden">
      {/* 1. Header Minimalista da Sessão */}
      <LiveSessionHeader
        sessionId={sessionId}
        patientName={patientName}
        streamState={streamState}
        startTime={startTime}
        captureEnabled={captureEnabled}
        audioState={audioState}
        onPause={captureEnabled ? onPause : undefined}
        onResume={captureEnabled ? onResume : undefined}
        onEndSession={onEndSession}
        onBack={onBack}
        onOpenContext={() => setContextDrawerOpen(true)}
      />

      {/* 2. Área Central de Trabalho: Dois Cards Flutuantes Independentes */}
      <main className="flex-1 min-h-0 w-full p-4 sm:p-5 lg:p-6 overflow-hidden flex flex-col gap-4">
        <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          {/* CARD 1: Transcrição ao Vivo (Aprox 65% ~ 8 cols) */}
          <div className="lg:col-span-8 h-full min-h-0 min-w-0 flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <LiveTranscriptPanel
              transcripts={transcripts}
              interimTranscript={interimTranscript}
              patientName={patientName}
              streamState={streamState}
              isPaused={isPaused}
            />
          </div>

          {/* CARD 2: Copilot Assistivo (Aprox 35% ~ 4 cols) */}
          <div className="lg:col-span-4 h-full min-h-0 min-w-0 flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <CopilotFeedPanel
              events={events}
              patientName={patientName}
              patientMemory={patientMemory}
              lastSessionDate={lastSessionDate}
              streamState={streamState}
              onDismiss={onDismissEvent}
              onOpenContextSection={() => setContextDrawerOpen(true)}
            />
          </div>
        </div>

        {/* 3. Barra Inferior de Controles Flutuantes (Bottom Bar) */}
        <footer className="w-full shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Card Flutuante Esquerda: Microfone & Ações Rápidas */}
          {captureEnabled ? (
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 rounded-2xl border border-slate-200/80 bg-white px-4 sm:px-5 py-2.5 shadow-2xs">
              {/* Microfone Ativo + Ondas Sonoras */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all shadow-2xs cursor-pointer ${micButtonClass}`}
                  title={isPaused ? "Microfone pausado (clique para retomar)" : "Microfone ativo"}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {isPaused ? "Microfone pausado" : "Microfone ativo"}
                  </span>

                  <AudioLevelMeter captureEnabled={captureEnabled} isPaused={isPaused} />
                </div>
              </div>

              <div className="hidden sm:block h-6 w-px bg-slate-200" />

              {/* Ações Rápidas com Rótulos Abaixo */}
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Pausar / Retomar */}
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors shadow-2xs">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      {isPaused ? (
                        <polygon points="5 3 19 12 5 21 5 3" />
                      ) : (
                        <>
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </>
                      )}
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {isPaused ? "Retomar" : "Pausar"}
                  </span>
                </button>

                {/* Marcar Tópico */}
                <button
                  type="button"
                  onClick={handleMarkTopic}
                  className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
                  title="Marcar momento clínico relevante"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors shadow-2xs">
                    <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">Marcar tópico</span>
                </button>

                {/* Adicionar Nota */}
                <button
                  type="button"
                  onClick={() => setQuickNoteOpen(!quickNoteOpen)}
                  className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
                  title="Escrever anotação rápida da sessão"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors shadow-2xs">
                    <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">Adicionar nota</span>
                </button>
              </div>
            </div>
          ) : (
            /* Pré-captura: botão proeminente para iniciar escuta */
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 sm:px-5 py-2.5 shadow-2xs">
              <button
                type="button"
                onClick={onStartCapture}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold shadow cursor-pointer transition-colors"
              >
                ▶ Iniciar escuta
              </button>
              <span className="text-xs text-slate-500">
                Clique para ativar a captura de áudio e transcrição em tempo real
              </span>
            </div>
          )}

          {/* Card Flutuante Direita: Status do Copilot */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100/90 text-teal-800 shadow-2xs">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-teal-700" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>

            <div>
              <CopilotStatusBadge captureEnabled={captureEnabled} audioState={audioState} />
              <p className="text-[11px] text-slate-500 mt-0.5">
                {captureEnabled && (audioState === "listening" || audioState === "transcribing")
                  ? "Acompanhando a conversa em tempo real"
                  : "Aguardando início da captura"}
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Toast de Tópico Marcado */}
      {topicMarkedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-teal-900 text-white px-5 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>✓ Tópico clínico marcado na linha do tempo</span>
        </div>
      )}

      {/* Modal de Anotação Rápida */}
      {quickNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveQuickNote}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Anotação Rápida da Sessão
              </h3>
              <button
                type="button"
                onClick={() => setQuickNoteOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={3}
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              placeholder="Escreva uma observação clínica sobre este momento da conversa..."
              className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickNoteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00897B] hover:bg-[#00796B] text-white shadow-2xs transition-colors"
              >
                Salvar Nota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drawer Contexto do Paciente (Sob Demanda) */}
      <PatientContextDrawer
        isOpen={contextDrawerOpen}
        onClose={() => setContextDrawerOpen(false)}
        patientName={patientName}
        patientMemory={patientMemory}
        lastSessionDate={lastSessionDate}
      />
    </div>
  );
}
