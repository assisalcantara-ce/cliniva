export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "consultar_horarios",
      description:
        "Consulta os horários reais disponíveis na agenda do terapeuta em um intervalo de datas. Use sempre que o usuário perguntar por vagas ou sugerir uma data.",
      parameters: {
        type: "object",
        properties: {
          data_inicio: {
            type: "string",
            description: "Data inicial no formato YYYY-MM-DD",
          },
          data_fim: {
            type: "string",
            description: "Data final no formato YYYY-MM-DD (máximo 15 dias após data_inicio)",
          },
        },
        required: ["data_inicio", "data_fim"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propor_agendamento",
      description:
        "Cria uma proposta formal de agendamento na tela do usuário para um horário disponível previamente confirmado. A IA NÃO confirma o agendamento; esta função apenas exibe o card de resumo para o usuário clicar em Confirmar.",
      parameters: {
        type: "object",
        properties: {
          nome_paciente: {
            type: "string",
            description: "Nome completo do paciente",
          },
          whatsapp: {
            type: "string",
            description: "Número do WhatsApp do paciente com DDD (ex: 11999998888)",
          },
          data_horario_inicio: {
            type: "string",
            description: "Data e hora de início em formato ISO 8601 (ex: 2026-11-06T19:00:00.000Z)",
          },
          data_horario_fim: {
            type: "string",
            description: "Data e hora de término em formato ISO 8601 (ex: 2026-11-06T19:50:00.000Z)",
          },
          observacoes: {
            type: "string",
            description: "Observações adicionais ou modalidade informada (Online / Presencial)",
          },
        },
        required: ["nome_paciente", "whatsapp", "data_horario_inicio", "data_horario_fim"],
      },
    },
  },
];
