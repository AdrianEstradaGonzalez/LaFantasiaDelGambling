import { FastifyPluginAsync } from "fastify";
import { LeagueController } from "../controllers/league.controller.js";
import { getRealtimePoints } from "../controllers/realtime.controller.js";

const leagueRoutes: FastifyPluginAsync = async (app) => {
  // proteger todas con JWT
  app.addHook("preHandler", app.auth);

  app.post("/", LeagueController.create);                         // crear liga (líder = req.user.id)
  app.delete("/:leagueId", LeagueController.remove);              // borrar liga (solo líder)
  app.post("/:leagueId/members", LeagueController.addMember);     // añadir usuario
  app.post("/join/:code", LeagueController.addMemberByCode);      // unirse por código
  app.delete("/:leagueId/members/:userId", LeagueController.removeMember); // quitar usuario
  app.post("/:leagueId/leave", LeagueController.leaveLeague);     // abandonar liga
  app.get("/:leagueId/members", LeagueController.listMembers);    // listar miembros
  app.get("/:leagueId/classifications", LeagueController.getAllClassifications); // obtener todas las clasificaciones
  app.get("/:leagueId/classification/paginated", LeagueController.getPaginatedClassification); // obtener clasificación paginada
  app.get("/:leagueId/user-position", LeagueController.getUserPosition); // obtener posición del usuario
  app.get("/:leagueId/invalid-team-status", LeagueController.checkInvalidTeam); // verificar si el equipo es inválido
  app.post("/:leagueId/calculate-realtime", LeagueController.calculateRealTimePoints); // calcular puntos en tiempo real (lee datos ya calculados)
  app.get("/:leagueId/realtime", getRealtimePoints); // obtener puntos en tiempo real desde caché
  app.post("/trigger-points-calculation", LeagueController.triggerPointsCalculation); // disparar cálculo de puntos para todas las ligas
  app.post("/:leagueId/upgrade-to-premium", LeagueController.upgradeLeagueToPremium); // actualizar liga a premium
  app.get("/user/:userId", LeagueController.getByUser);

};

export default leagueRoutes;
