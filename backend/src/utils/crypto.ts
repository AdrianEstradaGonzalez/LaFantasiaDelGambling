import crypto from "node:crypto";
export function sha256(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }
export function genCode() { return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"); }
