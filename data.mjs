// Guarda o conteúdo da wiki (Netlify Blobs). Só admins autenticados podem salvar.
import { getStore } from "@netlify/blobs";
import { verify } from "./_lib.mjs";
export const config = { path: "/api/data" };
export default async (req) => {
  const store = getStore("lunex");
  if (req.method === "GET") return Response.json((await store.get("db", { type: "json" })) || {});
  if (req.method === "POST") {
    if (!verify((req.headers.get("authorization") || "").replace("Bearer ", ""))) return new Response("Unauthorized", { status: 401 });
    await store.setJSON("db", await req.json());
    return Response.json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};
