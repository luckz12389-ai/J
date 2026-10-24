import { createHmac, timingSafeEqual } from "node:crypto";
const key = () => process.env.TOKEN_SECRET || "troque-este-segredo";
const sig = (v) => createHmac("sha256", key()).update(v).digest("hex");
export const sign = () => { const exp = String(Date.now() + 6 * 3600e3); return exp + "." + sig(exp); };
export const verify = (t = "") => {
  const [exp, s] = t.split(".");
  if (!exp || !s || Number(exp) < Date.now()) return false;
  const a = Buffer.from(s), b = Buffer.from(sig(exp));
  return a.length === b.length && timingSafeEqual(a, b);
};
