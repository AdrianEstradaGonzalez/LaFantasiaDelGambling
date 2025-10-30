import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authRoutes } from "./routes/auth.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { env } from "./config/env.js";
import { AppError } from "./utils/errors.js";
import { ZodError } from "zod";
import leagueRoutes from "./routes/league.routes.js";
import squadRoutes from "./routes/squad.routes.js";
import playerRoutes from "./routes/player.routes.js";
import betRoutes from "./routes/bet.routes.js";
import betCombiRoutes from "./routes/betCombi.routes.js";
import betOptionRoutes from "./routes/betOption.routes.js";
import jornadaRoutes from "./routes/jornada.routes.js";
import { playerStatsRoutes } from "./routes/playerStats.routes.js";
import playerStatusRoutes from "./routes/playerStatus.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: env.NODE_ENV === "development" ? {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      } : undefined,
    },
    // Permitir Content-Type: application/json en GET requests sin body
    ignoreTrailingSlash: true,
    disableRequestLogging: false,
  });

  // Configurar parser de JSON para permitir body vacío
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    try {
      const json = body === '' ? {} : JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Plugins de seguridad
  await app.register(cors, {
    origin: env.APP_ORIGIN,
    credentials: true
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: "365d" // 1 año - sesión sin expiración práctica
    }
  });

  // Swagger docs
  await app.register(swagger, {
    swagger: {
      info: {
        title: "Fantasy API",
        description: "API Documentation",
        version: "1.0.0",
      },
      securityDefinitions: {
        bearerAuth: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });

  // Auth guard
  app.decorate("auth", async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      throw new AppError(401, "UNAUTHORIZED", "Token inválido o expirado");
    }
  });

  // Error handler global
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      // Extraer el primer error de validación con mensaje personalizado
      const firstError = error.errors[0];
      const message = firstError?.message || "Datos inválidos";
      
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: message,
        details: error.errors,
      });
    }

    // Error genérico
    reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "development" ? error.message : "Error interno del servidor",
    });
  });

  // Rutas
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(leagueRoutes, { prefix: "/leagues" });
  await app.register(squadRoutes, { prefix: "/squads" });
  await app.register(playerRoutes, { prefix: "/players" });
  await app.register(betRoutes, { prefix: "/bets" });
  await app.register(betCombiRoutes, { prefix: "/bet-combis" });
  await app.register(betOptionRoutes, { prefix: "/" });
  await app.register(jornadaRoutes, { prefix: "/jornada" });
  await app.register(playerStatsRoutes, { prefix: "/" });
  await app.register(playerStatusRoutes, { prefix: "/players" });
  await app.register(paymentRoutes, { prefix: "/payment" });

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    auth: any
  }
  // Do not redeclare 'user' here to avoid conflicts with @fastify/jwt
}

// If you want to type the JWT payload, augment @fastify/jwt instead:
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string; isAdmin: boolean };
    user: { sub: string; email: string; isAdmin: boolean };
  }
}
