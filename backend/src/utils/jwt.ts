import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "dev";

export function signAccess(sub: string, email?: string) {
  return jwt.sign({ sub, email }, SECRET, { expiresIn: "15m" });
}
export function signRefresh(sub: string) {
  return jwt.sign({ sub, type: "refresh" }, SECRET, { expiresIn: "7d" });
}
export function signReset(prcId: string, email: string, minutes: number) {
  return jwt.sign({ type: "password_reset", prcId, email }, SECRET, { expiresIn: `${minutes}m` });
}
export function verifyReset(token: string) {
  try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}
