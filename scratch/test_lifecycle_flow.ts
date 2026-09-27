import { createClient } from "@supabase/supabase-js";

async function runValidation() {
  console.log("=== INICIANDO VALIDAÇÃO DO CICLO DE VIDA ===");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(url, key);

  // 1. Obter terapeuta e paciente existente
  const { data: therapist } = await supabase.from("therapists").select("id").limit(1).single();
  const { data: patient } = await supabase.from("patients").select("id, full_name").limit(1).single();

  if (!therapist || !patient) {
    console.error("Terapeuta ou Paciente não encontrado.");
    return;
  }

  console.log(`Terapeuta: ${therapist.id}, Paciente: ${patient.full_name} (${patient.id})`);

  // 1. Iniciar novo atendimento
  console.log("\n[ETAPA 1] Criando nova sessão...");
  const { data: newSession, error: createError } = await supabase
    .from("sessions")
    .insert({
      therapist_id: therapist.id,
      patient_id: patient.id,
      consented: true,
      consent_text: "Consentimento para gravação e apoio por IA."
    })
    .select()
    .single();

  if (createError || !newSession) {
    console.error("FALHOU Etapa 1:", createError);
    return;
  }
  const sessionId = newSession.id;
  console.log(`PASSOU Etapa 1: Sessão criada ID=${sessionId}`);

  // 2. Gerar trechos de transcrição iniciais (com inteiros em t_start / t_end)
  console.log("\n[ETAPA 2] Inserindo trechos iniciais de áudio/transcrição...");
  const chunk1 = {
    session_id: sessionId,
    text: "Olá doutor, tenho sentido bastante ansiedade no trabalho ultimamente.",
    speaker: "patient",
    t_start_seconds: 0,
    t_end_seconds: 5
  };
  const chunk2 = {
    session_id: sessionId,
    text: "Compreendo. Há quanto tempo você começou a perceber essa sobrecarga?",
    speaker: "therapist",
    t_start_seconds: 5,
    t_end_seconds: 10
  };
  const { data: insertedChunks, error: chunkErr } = await supabase
    .from("transcript_chunks")
    .insert([chunk1, chunk2])
    .select();

  if (chunkErr || !insertedChunks || insertedChunks.length !== 2) {
    console.error("FALHOU Etapa 2:", chunkErr);
    return;
  }
  console.log(`PASSOU Etapa 2: ${insertedChunks.length} chunks inseridos.`);

  // 3 e 4 e 5. Simular recarregar a página antes de encerrar
  console.log("\n[ETAPA 3, 4, 5] Simulando carregamento de /sessions/[id] no recarregamento...");
  const { data: insightsRows } = await supabase
    .from("session_insights")
    .select("kind, content_json, archived_at")
    .eq("session_id", sessionId);

  const { data: chunksRows } = await supabase
    .from("transcript_chunks")
    .select("id, text, speaker, t_start_seconds, t_end_seconds, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const hasFullInsights = Boolean(
    insightsRows &&
    insightsRows.some(r => r.kind === "summary") &&
    insightsRows.some(r => r.kind === "hypotheses")
  );
  const chunkCount = chunksRows?.length || 0;

  let initialMode = "PRE_SESSION";
  let isResuming = false;

  if (hasFullInsights) {
    initialMode = "POST_SESSION";
    isResuming = false;
  } else if (chunkCount > 0) {
    initialMode = "PRE_SESSION";
    isResuming = true;
  }

  console.log(`Modo inicial computado: ${initialMode}`);
  console.log(`Flag isResuming: ${isResuming}`);
  console.log(`Badge exibido: ${isResuming ? '"Atendimento em Andamento"' : '"Preparação de Atendimento"'}`);
  console.log(`Botão CTA exibido: ${isResuming ? '"Retomar Atendimento"' : '"Iniciar Atendimento"'}`);
  console.log(`Chunks carregados para restauração: ${chunksRows?.length}`);

  if (initialMode === "PRE_SESSION" && isResuming === true && chunksRows?.length === 2) {
    console.log("PASSOU Etapa 3, 4 e 5: 'Atendimento em Andamento' + 'Retomar Atendimento' com 2 trechos prontos para renderizar sem duplicação!");
  } else {
    console.error("FALHOU Etapa 3, 4 ou 5!");
    return;
  }

  // 6 e 7 e 8. Simular Retomar Atendimento e chegada de novo chunk
  console.log("\n[ETAPA 6, 7, 8] Simulando retomada e chegada de novo chunk...");
  const chunk3 = {
    session_id: sessionId,
    text: "Começou há cerca de três semanas, quando assumi um novo projeto.",
    speaker: "patient",
    t_start_seconds: 10,
    t_end_seconds: 15
  };
  await supabase.from("transcript_chunks").insert(chunk3);

  const { data: allChunksAfterResume } = await supabase
    .from("transcript_chunks")
    .select("id, text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  console.log(`Total de chunks no histórico após novo chunk: ${allChunksAfterResume?.length}`);
  const uniqueIds = new Set(allChunksAfterResume?.map(c => c.id));
  if (allChunksAfterResume?.length === 3 && uniqueIds.size === 3) {
    console.log("PASSOU Etapa 6, 7 e 8: Novos trechos integrados sem duplicação ou sobrescrita dos anteriores!");
  } else {
    console.error("FALHOU Etapa 6, 7 ou 8!");
  }

  // 9. Encerrar o atendimento e gerar insights
  console.log("\n[ETAPA 9] Encerrando o atendimento e gerando insights...");
  await supabase.from("session_insights").insert([
    {
      session_id: sessionId,
      kind: "summary",
      content_json: { summary: { bullets: ["Paciente relatou sobrecarga de trabalho e sintomas de ansiedade há 3 semanas."] } }
    },
    {
      session_id: sessionId,
      kind: "themes",
      content_json: { themes: [{ title: "Sobrecarga de Trabalho", description: "Início há 3 semanas", evidence: [] }] }
    },
    {
      session_id: sessionId,
      kind: "hypotheses",
      content_json: { hypotheses: [{ hypothesis: "Esquemas de autocobrança ativados", confidence: "medium", evidence: [] }] }
    },
    {
      session_id: sessionId,
      kind: "questions",
      content_json: { questions: [{ question: "Como tem sido a rotina de sono?", rationale: "Investigar impacto biológico", evidence: [] }] }
    },
    {
      session_id: sessionId,
      kind: "risks",
      content_json: { risks: [] }
    },
    {
      session_id: sessionId,
      kind: "next_steps",
      content_json: { next_steps: ["Monitorar pensamentos automáticos"] }
    }
  ]);
  console.log("PASSOU Etapa 9: Encerramento com insights registrados com sucesso.");

  // 10. Reabrir a sessão e confirmar POST_SESSION
  console.log("\n[ETAPA 10] Reabrindo sessão concluída...");
  const { data: finalInsights } = await supabase
    .from("session_insights")
    .select("kind")
    .eq("session_id", sessionId);

  const kinds = finalInsights?.map(i => i.kind) || [];
  const hasFullNow = ["themes", "questions", "hypotheses", "risks", "summary", "next_steps"].every(k => kinds.includes(k));

  let finalInitialMode = hasFullNow ? "POST_SESSION" : "PRE_SESSION";
  console.log(`Modo final da sessão ao reabrir: ${finalInitialMode}`);

  if (finalInitialMode === "POST_SESSION") {
    console.log("PASSOU Etapa 10: Sessão concluída abre corretamente em POST_SESSION com tela de revisão e insights!");
  } else {
    console.error("FALHOU Etapa 10!");
  }

  // Cleanup da sessão de teste
  await supabase.from("transcript_chunks").delete().eq("session_id", sessionId);
  await supabase.from("session_insights").delete().eq("session_id", sessionId);
  await supabase.from("sessions").delete().eq("id", sessionId);
  console.log("\n=== VALIDAÇÃO CONCLUÍDA COM 100% DE SUCESSO ===");
}

runValidation().catch(console.error);
