import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import authRoutes from "./routes/auth.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });

app.decorate("auth", async (request: any, reply: any) => {
  try { await request.jwtVerify(); }
  catch { return reply.code(401).send({ error: "unauthorized" }); }
});

app.get("/health", async () => ({ ok: true }));

await app.register(authRoutes, { prefix: "/auth" });

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});

declare module "fastify" {
  interface FastifyInstance { auth: any; }
  interface FastifyRequest {
    jwtVerify: () => Promise<void>;
    user?: { id: string; email: string };
  }
}
