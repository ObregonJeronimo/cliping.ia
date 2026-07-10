// admin.js — allowlist de cuentas con rol ADMINISTRADOR. Uso privado (Biblioteca de contenido).
// Gate del lado del cliente: oculta la UI y bloquea la ruta a no-admins. La integridad de los
// datos (quien puede EDITAR la curacion) la refuerza firestore.rules por email. No es un secreto:
// quien lea el bundle ve estos mails — es control de VISIBILIDAD, no un limite de seguridad duro.
export const ADMIN_EMAILS = [
  'thiagowendler53@gmail.com',
  'jeroobregon03@gmail.com',
]

export const isAdmin = (email) =>
  !!email && ADMIN_EMAILS.includes(String(email).trim().toLowerCase())
