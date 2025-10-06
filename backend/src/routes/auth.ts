import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { z } from "zod";

const prisma = new PrismaClient();

const authRoutes: FastifyPluginAsync = async (app) => {
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional()
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
  });

  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.code(409).send({ error: "email_in_use" });

    const hash = await argon2.hash(body.password);
    const user = await prisma.user.create({
      data: { email: body.email, password: hash, name: body.name }
    });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    return reply.send({ user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
  });

  app.post("/login", async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });

    const ok = await argon2.verify(user.password, password);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

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
      select: { id: true, email: true, name: true }
    });
    return { user };
  });
};

export default authRoutes;
