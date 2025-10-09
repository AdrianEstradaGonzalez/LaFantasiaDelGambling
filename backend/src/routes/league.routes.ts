import { FastifyPluginAsync } from "fastify";
import { LeagueController } from "../controllers/league.controller";

const leagueRoutes: FastifyPluginAsync = async (app) => {
  // proteger todas con JWT
  app.addHook("preHandler", app.auth);

  app.post("/", LeagueController.create);                         // crear liga (líder = req.user.id)
  app.delete("/:leagueId", LeagueController.remove);              // borrar liga (solo líder)
  app.post("/:leagueId/members", LeagueController.addMember);     // añadir usuario
  app.delete("/:leagueId/members/:userId", LeagueController.removeMember); // quitar usuario
  app.get("/:leagueId/members", LeagueController.listMembers);    // listar miembros
};

export default leagueRoutes;
