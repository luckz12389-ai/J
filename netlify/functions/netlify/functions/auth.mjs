// Verificação de conta admin. Defina ADMIN_USER, ADMIN_PASS e TOKEN_SECRET no painel da Netlify.
import { sign } from "./_lib.mjs";
export const config = { path: "/api/auth" };
export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { user, pass } = await req.json().catch(() => ({}));
  const ok = process.env.ADMIN_USER && user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
  await new Promise((r) => setTimeout(r, 400));
  return ok ? Response.json({ token: sign() }) : Response.json({ error: "Credenciais inválidas" }, { status: 401 });
};
