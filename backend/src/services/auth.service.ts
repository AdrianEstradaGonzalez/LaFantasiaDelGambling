import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { signAccess, signRefresh, signReset, verifyReset } from "../utils/jwt.js";
import { genCode, sha256 } from "../utils/crypto.js";
import * as UserRepo from "../repositories/user.repo.js";
import * as ResetRepo from "../repositories/resetCode.repo.js";
import { sendResetCodeEmail } from "./mail.service.js";

const prisma = new PrismaClient();
const TTL_MIN = Number(process.env.RESET_CODE_TTL_MINUTES || 30);
const MAX_ATTEMPTS = Number(process.env.RESET_CODE_MAX_ATTEMPTS || 5);

export async function register({ email, password, name }: { email: string; password: string; name?: string }) {
  const exists = await UserRepo.findByEmail(email);
  if (exists) throw new Error("email_in_use");
  const hash = await argon2.hash(password);
  const user = await UserRepo.create({ email, password: hash, name });
  return { user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || false }, ...await issueTokens(user.id, user.email, user.isAdmin || false) };
}

export async function login({ email, password }: { email: string; password: string }) {
  const user = await UserRepo.findByEmail(email);
  if (!user) throw new Error("invalid_credentials");
  const ok = await argon2.verify(user.password, password);
  if (!ok) throw new Error("invalid_credentials");
  return { user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || false }, ...await issueTokens(user.id, user.email, user.isAdmin || false) };
}

export async function me(userId: string) {
  const u = await UserRepo.findById(userId);
  return { user: u ? { id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin || false } : null };
}

export async function changePassword(userId: string, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  const user = await UserRepo.findById(userId);
  if (!user) throw new Error("unauthorized");
  const ok = await argon2.verify(user.password, currentPassword);
  if (!ok) throw new Error("wrong_current_password");
  if (await argon2.verify(user.password, newPassword)) throw new Error("same_password");
  const newHash = await argon2.hash(newPassword);
  await UserRepo.updatePassword(user.id, newHash);
}

export async function refresh(refreshToken: string) {
  try {
    // validación simple: JWT.verify lo haces con fastify-jwt en controller; aquí emitimos nuevo access
    const payload = (await (global as any).app?.jwt?.verify(refreshToken)) as any; // opcional si quieres moverlo aquí
    const user = await UserRepo.findById(payload.sub);
    if (!user) return null;
    return { accessToken: signAccess(user.id, user.email, user.isAdmin || false) };
  } catch { return null; }
}

export async function issueTokens(userId: string, email?: string, isAdmin?: boolean) {
  return { accessToken: signAccess(userId, email, isAdmin || false), refreshToken: signRefresh(userId) };
}

// Reset por código
export async function requestResetCode(email: string) {
  const user = await UserRepo.findByEmail(email);

  // invalidar activos
  await ResetRepo.invalidateActive(email);

  const code = genCode();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await ResetRepo.create({ email, userId: user?.id ?? null, codeHash, expiresAt });
  if (user) await sendResetCodeEmail(email, code, TTL_MIN);
}

export async function verifyResetCode(email: string, code: string) {
  const rec = await ResetRepo.findActiveByEmail(email);
  if (!rec) return null;
  if (rec.attempts >= MAX_ATTEMPTS) { await ResetRepo.use(rec.id); return null; }
  if (rec.codeHash !== sha256(code)) { await ResetRepo.bumpAttempts(rec.id); return null; }
  await ResetRepo.markVerified(rec.id);
  return signReset(rec.id, email, Math.min(TTL_MIN, 15));
}

export async function setNewPassword(resetToken: string, newPassword: string) {
  const payload = verifyReset(resetToken);
  if (!payload) return null;

  const rec = await ResetRepo.findById(payload.prcId);
  if (!rec || rec.used || !rec.verified || rec.expiresAt < new Date() || rec.email !== payload.email) return null;

  const user = await UserRepo.findByEmail(rec.email);
  if (!user) { await ResetRepo.use(rec.id); return null; }

  const newHash = await argon2.hash(newPassword);
  await prisma.$transaction([
    UserRepo.updatePassword(user.id, newHash, prisma),
    ResetRepo.use(rec.id, prisma),
    ResetRepo.invalidateOthers(rec.email, rec.id, prisma),
  ]);

  return await issueTokens(user.id, user.email, user.isAdmin || false);
}
