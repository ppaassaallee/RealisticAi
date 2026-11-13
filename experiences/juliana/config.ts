export const modes = {
  community: {
    name: "Caja comunitaria",
    context: "Servicios cerca de tu comunidad",
    priority: ["collect", "account", "pay", "loan", "migrant", "help"],
  },
  consulate: {
    name: "Consulado móvil",
    context: "Un puente con tu familia en Guatemala",
    priority: ["migrant", "consular", "send", "save", "fraud", "help"],
  },
  fair: {
    name: "Feria comercial",
    context: "Ideas para tu próximo gran paso",
    priority: ["loan", "account", "save", "send", "migrant", "help"],
  },
  mall: {
    name: "Centro comercial",
    context: "Tu banco, a tu ritmo",
    priority: ["account", "pay", "collect", "loan", "save", "help"],
  },
} as const;
export type Mode = keyof typeof modes;
export const journeys = {
  send: {
    title: "Enviar una remesa",
    short: "Enviar dinero",
    category: "Remesas",
    description: "Explorá un envío a Guatemala, paso a paso.",
  },
  collect: {
    title: "Cobrar una remesa",
    short: "Cobrar dinero",
    category: "Remesas",
    description: "Consultá un envío de prueba y cómo cobrarlo.",
  },
  account: {
    title: "Mis cuentas y tarjetas",
    short: "Abrir una cuenta",
    category: "Cuentas",
    description: "Encontrá una cuenta de ejemplo para tu objetivo.",
  },
  pay: {
    title: "Pagos y servicios",
    short: "Pagar un servicio",
    category: "Servicios",
    description: "Revisá y confirmá un pago simulado.",
  },
  loan: {
    title: "Créditos y ahorro",
    short: "Simular un crédito",
    category: "Crédito",
    description: "Conocé una cuota educativa, sin compromiso.",
  },
  save: {
    title: "Mi casita en Guatemala",
    short: "Planear mi ahorro",
    category: "Ahorro",
    description: "Convertí una meta en pequeños pasos.",
  },
  migrant: {
    title: "Soy migrante",
    short: "Orientación para migrantes",
    category: "Migrantes",
    description: "Cuidá tu dinero y acercate a tu familia.",
  },
  consular: {
    title: "Trámites consulares",
    short: "Documentos y consulados",
    category: "Documentos",
    description: "Encontrá el canal oficial para tu trámite.",
  },
  fraud: {
    title: "Reportar un problema o fraude",
    short: "Proteger mi dinero",
    category: "Seguridad",
    description: "Tomá medidas y pedí ayuda sin compartir secretos.",
  },
  help: {
    title: "Necesito ayuda",
    short: "Hablar con una persona",
    category: "Atención",
    description: "Solicitá acompañamiento de nuestro equipo.",
  },
} as const;
export type Journey = keyof typeof journeys;
export const journeyIds = Object.keys(journeys) as Journey[];
export type BankConfig = {
  mode: Mode;
  language: "es" | "en";
  accent: "forest" | "olive";
  notice: string;
  enabled: Journey[];
  disabledKnowledge: string[];
  integration: "demo";
};
export const defaultConfig: BankConfig = {
  mode: "community",
  language: "es",
  accent: "forest",
  notice: "Experiencia demo · Usá datos de prueba.",
  enabled: [...journeyIds],
  disabledKnowledge: [],
  integration: "demo",
};
export const officialLinks = [
  {
    title: "MINEX · Servicios y red consular",
    url: "https://www.minex.gob.gt/",
  },
  {
    title: "RENAP · Identificación y registro civil",
    url: "https://www.renap.gob.gt/",
  },
  { title: "Migración · Información oficial", url: "https://igm.gob.gt/" },
  {
    title: "CONAMIGUA · Orientación para migrantes",
    url: "https://conamigua.gob.gt/",
  },
  { title: "SIB · Educación financiera", url: "https://www.sib.gob.gt/" },
];
// Modes can narrow capabilities; neither a client nor the voice model can bypass this policy.
export const modeTools: Record<Mode, Journey[]> = {
  community: [...journeyIds],
  consulate: journeyIds.filter((j) => j !== "pay"),
  fair: journeyIds.filter((j) => j !== "pay" && j !== "collect"),
  mall: [...journeyIds],
};
