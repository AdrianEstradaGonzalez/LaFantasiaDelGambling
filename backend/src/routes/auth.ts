// src/routes/auth.ts
import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { z } from "zod";
import crypto from "node:crypto";
import { sendResetCodeEmail } from "../lib/mailer.js";

const prisma = new PrismaClient();

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function gen6Code() {
  // 6 dígitos, con ceros a la izquierda si hace falta
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

const authRoutes: FastifyPluginAsync = async (app) => {
  // ====== Schemas ======
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  const changePwdSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  // ====== Auth básico ======
  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.code(409).send({ error: "email_in_use" });

    const hash = await argon2.hash(body.password);
    const user = await prisma.user.create({
      data: { email: body.email, password: hash, name: body.name },
    });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    return reply.send({ user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
  });

  app.post("/login", async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });

    const valid = await argon2.verify(user.password, password);
    if (!valid) return reply.code(401).send({ error: "invalid_credentials" });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    return reply.send({ user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
  });

  app.post("/refresh", async (req, reply) => {
    const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
    if (!token) return reply.code(401).send({ error: "no_token" });

    try {
      const payload = app.jwt.verify(token) as any;
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return reply.code(401).send({ error: "invalid_token" });

      const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
      return reply.send({ accessToken });
    } catch {
      return reply.code(401).send({ error: "invalid_token" });
    }
  });

  app.get("/me", { preHandler: app.auth }, async (req: any) => {
    const decoded = req.user as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true },
    });
    return { user };
  });

  app.post("/change-password", { preHandler: app.auth }, async (req: any, reply) => {
    const { currentPassword, newPassword } = changePwdSchema.parse(req.body);
    const decoded = req.user as any;

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return reply.code(401).send({ error: "unauthorized" });

    const ok = await argon2.verify(user.password, currentPassword);
    if (!ok) return reply.code(400).send({ error: "wrong_current_password" });

    const sameAsOld = await argon2.verify(user.password, newPassword);
    if (sameAsOld) return reply.code(400).send({ error: "same_password" });

    const newHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    return reply.send({ ok: true, accessToken, refreshToken });
  });

  // ====== Olvidé mi contraseña (Código por email) ======

  // 1) Solicitar código
  app.post("/request-reset-code", async (req, reply) => {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    // Busca usuario (no revelamos si existe o no en la respuesta)
    const user = await prisma.user.findUnique({ where: { email } });

    // invalida códigos previos activos de ese email (higiene)
    await prisma.passwordResetCode.updateMany({
      where: { email, used: false, expiresAt: { gt: new Date() } },
      data: { used: true }
    });

    // genera código y lo hashea
    const code = gen6Code();
    const codeHash = sha256(code);
    const ttlMin = Number(process.env.RESET_CODE_TTL_MINUTES || 30);
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await prisma.passwordResetCode.create({
      data: {
        email,
        userId: user?.id ?? null,
        codeHash,
        expiresAt
      }
    });

    // envía el código solo si el email existe (si no existe, respondemos igual para no enumerar)
    if (user) {
      await sendResetCodeEmail(email, code, ttlMin);
    }

    // siempre 202 OK para no filtrar emails
    return reply.code(202).send({ ok: true });
  });

  // 2) Verificar código → devuelve resetToken corto (JWT) para autorizar el cambio
  app.post("/verify-reset-code", async (req, reply) => {
    const schema = z.object({ email: z.string().email(), code: z.string().min(4).max(10) });
    const { email, code } = schema.parse(req.body);

    const ttlMin = Number(process.env.RESET_CODE_TTL_MINUTES || 30);
    const maxAttempts = Number(process.env.RESET_CODE_MAX_ATTEMPTS || 5);

    // Busca el último código activo para ese email
    const rec = await prisma.passwordResetCode.findFirst({
      where: { email, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    if (!rec) return reply.code(400).send({ error: "invalid_or_expired" });

    if (rec.attempts >= maxAttempts) {
      // marca como usado para bloquear brute force
      await prisma.passwordResetCode.update({ where: { id: rec.id }, data: { used: true } });
      return reply.code(400).send({ error: "too_many_attempts" });
    }

    const isMatch = rec.codeHash === sha256(code);
    if (!isMatch) {
      await prisma.passwordResetCode.update({
        where: { id: rec.id },
        data: { attempts: { increment: 1 } }
      });
      return reply.code(400).send({ error: "invalid_code" });
    }

    // marca verificado (pero no usado aún)
    await prisma.passwordResetCode.update({
      where: { id: rec.id },
      data: { verified: true }
    });

    // emitimos resetToken atado al id del código y al email (15 min)
    const resetToken = app.jwt.sign(
      { type: "password_reset", prcId: rec.id, email },
      { expiresIn: Math.min(ttlMin, 15) + "m" }
    );

    return reply.send({ ok: true, resetToken });
  });

  // 3) Fijar nueva contraseña usando resetToken
  app.post("/set-new-password", async (req, reply) => {
    const schema = z.object({
      resetToken: z.string().min(10),
      newPassword: z.string().min(8)
    });
    const { resetToken, newPassword } = schema.parse(req.body);

    // valida JWT
    let payload: any;
    try {
      payload = app.jwt.verify(resetToken);
      if (payload?.type !== "password_reset") throw new Error("bad_type");
    } catch {
      return reply.code(400).send({ error: "invalid_token" });
    }

    const rec = await prisma.passwordResetCode.findUnique({ where: { id: payload.prcId } });
    if (!rec || rec.used || !rec.verified || rec.expiresAt < new Date() || rec.email !== payload.email) {
      return reply.code(400).send({ error: "invalid_or_expired" });
    }

    // usuario debe existir a estas alturas
    const user = await prisma.user.findUnique({ where: { email: rec.email } });
    if (!user) {
      // invalida el código por coherencia
      await prisma.passwordResetCode.update({ where: { id: rec.id }, data: { used: true } });
      return reply.code(400).send({ error: "user_not_found" });
    }

    const newHash = await argon2.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: newHash } }),
      prisma.passwordResetCode.update({ where: { id: rec.id }, data: { used: true } }),
      prisma.passwordResetCode.updateMany({
        where: { email: rec.email, used: false, id: { not: rec.id } },
        data: { used: true }
      })
    ]);

    // opcional: emitir nuevas credenciales
    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    return reply.send({ ok: true, accessToken, refreshToken });
  });
};

export default authRoutes;
