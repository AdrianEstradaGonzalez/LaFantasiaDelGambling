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
  if (exists) {
    const error: any = new Error("Este correo ya está registrado. Intenta iniciar sesión.");
    error.statusCode = 409;
    throw error;
  }
  const hash = await argon2.hash(password);
  const user = await UserRepo.create({ email, password: hash, name });
  const tokens = await issueTokens(user.id, user.email, user.isAdmin || false);
  return { user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || false }, ...tokens };
}

export async function login({ email, password }: { email: string; password: string }) {
  const user = await UserRepo.findByEmail(email);
  if (!user) {
    const error: any = new Error("Usuario no registrado. Por favor, regístrate primero.");
    error.statusCode = 404;
    throw error;
  }
  const ok = await argon2.verify(user.password, password);
  if (!ok) {
    const error: any = new Error("Contraseña incorrecta. Verifica tus credenciales.");
    error.statusCode = 401;
    throw error;
  }
  const tokens = await issueTokens(user.id, user.email, user.isAdmin || false);
  return { user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || false }, ...tokens };
}

export async function me(userId: string) {
  const u = await UserRepo.findById(userId);
  return { user: u ? { id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin || false } : null };
}

export async function updateProfile(userId: string, { name, email }: { name?: string; email?: string }) {
  const user = await UserRepo.findById(userId);
  if (!user) {
    const error: any = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // Si se intenta cambiar el email, verificar que no exista
  if (email && email !== user.email) {
    const exists = await UserRepo.findByEmail(email);
    if (exists) {
      const error: any = new Error("Este correo ya está registrado");
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
    },
    select: { id: true, email: true, name: true, isAdmin: true }
  });

  return { user: updated };
}

export async function changePassword(userId: string, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  const user = await UserRepo.findById(userId);
  if (!user) {
    const error: any = new Error("Usuario no autorizado");
    error.statusCode = 401;
    throw error;
  }
  const ok = await argon2.verify(user.password, currentPassword);
  if (!ok) {
    const error: any = new Error("La contraseña actual es incorrecta");
    error.statusCode = 400;
    throw error;
  }
  if (await argon2.verify(user.password, newPassword)) {
    const error: any = new Error("La nueva contraseña debe ser diferente a la actual");
    error.statusCode = 400;
    throw error;
  }
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

/**
 * Elimina permanentemente la cuenta de un usuario y todos sus datos asociados
 * Esta acción es irreversible
 */
export async function deleteAccount(userId: string) {
  console.log(`[deleteAccount] Iniciando eliminación del usuario: ${userId}`);

  await prisma.$transaction(async (tx) => {
    // 1. Obtener todas las membresías de liga del usuario
    const leagueMemberships = await tx.leagueMember.findMany({
      where: { userId },
      select: { id: true, leagueId: true },
    });

    const leagueMemberIds = leagueMemberships.map(lm => lm.id);
    const leagueIds = leagueMemberships.map(lm => lm.leagueId);

    console.log(`[deleteAccount] Usuario tiene ${leagueMemberIds.length} membresías de liga`);

    if (leagueMemberIds.length > 0) {
      // 2. Eliminar todas las plantillas (squads) y sus jugadores
      const squads = await tx.squad.findMany({
        where: { leagueId: { in: leagueIds }, userId },
        select: { id: true },
      });
      const squadIds = squads.map(s => s.id);

      if (squadIds.length > 0) {
        console.log(`[deleteAccount] Eliminando ${squadIds.length} plantillas y sus jugadores`);
        await tx.squadPlayer.deleteMany({ where: { squadId: { in: squadIds } } });
        await tx.squad.deleteMany({ where: { id: { in: squadIds } } });
      }

      // 3. Eliminar historial de plantillas
      await tx.squadHistory.deleteMany({ where: { userId, leagueId: { in: leagueIds } } });

      // 4. Eliminar apuestas y combis
      console.log(`[deleteAccount] Eliminando apuestas del usuario`);
      await tx.bet.deleteMany({ where: { leagueMemberId: { in: leagueMemberIds } } });
      await tx.betCombi.deleteMany({ where: { leagueMemberId: { in: leagueMemberIds } } });

      // 5. Eliminar registros de equipos inválidos
      await tx.invalidTeam.deleteMany({ where: { leagueMemberId: { in: leagueMemberIds } } });

      // 6. Eliminar membresías de liga
      console.log(`[deleteAccount] Eliminando membresías de liga`);
      await tx.leagueMember.deleteMany({ where: { id: { in: leagueMemberIds } } });
    }

    // 7. Eliminar tokens de dispositivo (notificaciones)
    await tx.deviceToken.deleteMany({ where: { userId } });

    // 8. Eliminar códigos de reseteo de contraseña
    await tx.passwordResetCode.deleteMany({ where: { userId } });

    // 9. Eliminar historial de ofertas diarias
    await tx.offerHistory.deleteMany({ where: { userId } });

    // 10. Finalmente, eliminar el usuario
    console.log(`[deleteAccount] Eliminando usuario ${userId}`);
    await tx.user.delete({ where: { id: userId } });

    console.log(`[deleteAccount] ✅ Usuario ${userId} eliminado exitosamente`);
  });
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
