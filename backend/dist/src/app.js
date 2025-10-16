import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authRoutes } from "./routes/auth.routes.js";
import { env } from "./config/env.js";
import { AppError } from "./utils/errors.js";
import { ZodError } from "zod";
import leagueRoutes from "./routes/league.routes";
import squadRoutes from "./routes/squad.routes";
import playerRoutes from "./routes/player.routes";
import betRoutes from "./routes/bet.routes";
import jornadaRoutes from "./routes/jornada.routes";
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
    app.decorate("auth", async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch (err) {
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
            return reply.status(400).send({
                error: "VALIDATION_ERROR",
                message: "Datos inválidos",
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
    await app.register(leagueRoutes, { prefix: "/leagues" });
    await app.register(squadRoutes, { prefix: "/squads" });
    await app.register(playerRoutes, { prefix: "/players" });
    await app.register(betRoutes, { prefix: "/bets" });
    await app.register(jornadaRoutes, { prefix: "/jornada" });
    return app;
}
