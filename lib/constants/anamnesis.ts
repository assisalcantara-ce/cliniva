export type QuestionGroup = {
  id: string;
  title: string;
  questions: string[];
};

export const questionGroups: QuestionGroup[] = [
  {
    id: "queixa-principal",
    title: "1. Queixa Principal e Motivo da Procura",
    questions: [
      "O que trouxe você a terapia neste momento?",
      "Há quanto tempo isso tem acontecido?",
      "Como isso afeta sua vida cotidiana?",
    ],
  },
  {
    id: "historia-familiar",
    title: "2. História Familiar",
    questions: [
      "Como você descreveria sua família de origem?",
      "Como era sua relação com seus pais na infância? E atualmente?",
      "Há histórico familiar de transtornos mentais, dependência química ou suicídio?",
    ],
  },
  {
    id: "desenvolvimento-infantil",
    title: "3. Desenvolvimento Infantil",
    questions: [
      "Como foi sua infância?",
      "Há lembranças marcantes (boas ou ruins)?",
      "Como era seu comportamento na escola e em casa?",
    ],
  },
  {
    id: "relacoes-afetivas",
    title: "4. Relações Afetivas e Sociais",
    questions: [
      "Você se considera uma pessoa sociável?",
      "Tem amigos próximos ou rede de apoio?",
      "Está em um relacionamento? Como o descreveria?",
    ],
  },
  {
    id: "saude-fisica-mental",
    title: "5. Saúde Física e Mental",
    questions: [
      "Já teve algum diagnóstico médico ou psiquiátrico?",
      "Faz uso de medicamentos? Quais?",
      "Já passou por internações ou tratamentos psicológicos/psiquiátricos?",
    ],
  },
  {
    id: "uso-substancias",
    title: "6. Uso de Substâncias",
    questions: [
      "Faz uso de álcool, cigarro, maconha ou outras substâncias?",
      "Com que frequência?",
      "Isso afeta seu cotidiano?",
    ],
  },
  {
    id: "rotina-autocuidado",
    title: "7. Rotina e Autocuidado",
    questions: [
      "Como é um dia típico seu?",
      "Como está seu sono e alimentação?",
      "Pratica alguma atividade física ou lazer?",
    ],
  },
  {
    id: "estressores-enfrentamento",
    title: "8. Estressores Atuais e Estratégias de Enfrentamento",
    questions: [
      "O que tem te causado mais estresse ultimamente?",
      "Como você costuma lidar com situações difíceis?",
      "Costuma conversar com alguém sobre seus sentimentos?",
    ],
  },
  {
    id: "expectativas-terapia",
    title: "9. Expectativas com a Psicoterapia",
    questions: [
      "O que você espera alcançar com a terapia?",
      "Já fez terapia antes? Como foi a experiência?",
      "Há algo que gostaria que eu soubesse sobre você?",
    ],
  },
  {
    id: "avaliacao-cognitiva",
    title: "10. Avaliação Cognitiva",
    questions: [
      "Quais pensamentos costumam surgir quando você se sente ansioso/triste/irritado?",
      "Você percebe algum padrão de pensamento repetitivo?",
      "Costuma se criticar com frequência? Em que situações?",
      "Como você interpreta eventos negativos que ocorrem em sua vida?",
      "Você sente que pensa 'sempre tudo dá errado' ou 'nunca faço nada certo'?",
    ],
  },
  {
    id: "crencas-centrais",
    title: "11. Crenças Centrais e Intermediárias",
    questions: [
      "Se você tivesse que se descrever em poucas palavras, como o faria?",
      "O que você acredita que as outras pessoas pensam de você?",
      "O que você acredita que precisa fazer para ser aceito ou ter valor?",
      "Há alguma ideia que você sente ser verdade absoluta sobre você mesmo ou sobre o mundo?",
    ],
  },
  {
    id: "comportamentos-desadaptativos",
    title: "12. Comportamentos Desadaptativos",
    questions: [
      "Quando está em sofrimento, o que você costuma fazer?",
      "Você evita certas situações, lugares ou pessoas? Quais e por quê?",
      "Já percebeu que repete certos comportamentos mesmo sabendo que são prejudiciais?",
      "Usa algo para se acalmar (comida, redes sociais, compras, etc.)?",
    ],
  },
  {
    id: "situacoes-emocionais",
    title: "13. Registro de Situações Emocionais Frequentes",
    questions: [
      "Quais situações costumam te deixar mais abalado emocionalmente?",
      "Como você reage fisicamente, emocionalmente e mentalmente nessas situações?",
      "O que você faz depois desses episódios?",
    ],
  },
  {
    id: "metas-terapeuticas",
    title: "14. Metas Terapêuticas (na ótica do paciente)",
    questions: [
      "Se esta terapia for bem-sucedida, o que mudará na sua vida?",
      "Quais habilidades você gostaria de desenvolver?",
      "Que tipo de pensamento ou comportamento você gostaria de modificar?",
    ],
  },
];
