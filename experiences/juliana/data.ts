// Fictional fixtures only. These are not Banco Interior products or actual customers.
const names = [
  "María López",
  "José García",
  "Ana Pérez",
  "Carlos Morales",
  "Rosa Hernández",
  "Luis Ramírez",
  "Carmen Díaz",
  "Pedro Gómez",
  "Elena Castillo",
  "Juan Méndez",
  "Marta Ortiz",
  "Diego Vásquez",
  "Lucía Reyes",
  "Miguel Cruz",
  "Sofía Aguilar",
  "Jorge Flores",
  "Teresa Santos",
  "Mario Ruiz",
  "Isabel León",
  "Pablo Soto",
];
export const users = names.map((name, i) => ({
  id: `DEMO-${String(i + 1).padStart(2, "0")}`,
  name,
  code: `PRUEBA-${String(i + 1).padStart(2, "0")}`,
}));
export const remittances = users.map((u, i) => ({
  reference: `REM-${String(i + 1).padStart(3, "0")}`,
  userId: u.id,
  amount: 750 + i * 125,
  currency: "GTQ",
  status: ["available", "pending", "cancelled", "collected"][i % 4],
}));
export const accounts = users
  .slice(0, 10)
  .map((u, i) => ({
    id: `CTA-${i + 1}`,
    userId: u.id,
    type: i % 2 ? "Ahorro demo" : "Monetaria demo",
    balance: 1500 + i * 350,
  }));
export const bills = Array.from({ length: 10 }, (_, i) => ({
  reference: `SERV-${String(i + 1).padStart(3, "0")}`,
  service: ["electricity", "water", "phone", "internet"][i % 4],
  amount: 100 + i * 25,
  status: i === 8 ? "pending" : i === 9 ? "rejected" : "ready",
}));
export const products = [
  {
    id: "savings",
    name: "Ahorro Familia · demo",
    purpose: "Separar dinero para una meta familiar",
    requirements:
      "Ejemplo educativo: identificación y validación de datos. Requisitos oficiales pendientes de aprobación.",
  },
  {
    id: "daily",
    name: "Cuenta Día a Día · demo",
    purpose: "Organizar ingresos y gastos cotidianos",
    requirements: "Documentación, costos y límites: pendientes de aprobación.",
  },
  {
    id: "remittance",
    name: "Cuenta Puente · demo",
    purpose: "Explorar recepción de remesas en cuenta",
    requirements:
      "Disponibilidad, canales y condiciones: pendientes de aprobación.",
  },
  {
    id: "business",
    name: "Emprendé · demo",
    purpose: "Separar las finanzas de tu negocio",
    requirements:
      "Verificación de actividad y documentación: pendiente de aprobación.",
  },
  {
    id: "housing",
    name: "Meta Hogar · demo",
    purpose: "Planificar el ahorro para vivienda",
    requirements:
      "No es una oferta ni una cuenta contratada. Condiciones pendientes de aprobación.",
  },
];
export const creditScenarios = [
  "Negocio",
  "Vivienda",
  "Agricultura",
  "Personal",
  "Comercio",
].map((purpose, i) => ({
  purpose,
  amount: 5000 * (i + 1),
  months: 12 * (i + 1),
  annualRate: 12,
  demo: true,
}));
export const savingsGoals = [
  "Casa",
  "Educación",
  "Emergencias",
  "Negocio",
  "Mejoras",
].map((purpose, i) => ({
  purpose,
  target: 12000 * (i + 1),
  months: 12 * (i + 1),
  saved: 0,
}));
export const locations = Array.from({ length: 10 }, (_, i) => ({
  id: `PUNTO-${i + 1}`,
  name: `Punto ilustrativo ${i + 1}`,
  zone: ["Comunidad", "Consulado", "Feria", "Centro comercial"][i % 4],
  address: "Ubicación ficticia; no visitar",
  hours: "Horario real pendiente de aprobación",
}));
