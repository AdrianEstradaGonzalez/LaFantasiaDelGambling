import { FastifyPluginAsync } from "fastify";
import adminController from "../controllers/admin.controller.js";

// Admin middleware to check if user is admin
async function adminAuth(req: any, reply: any) {
  // First authenticate the user
  await req.jwtVerify();
  
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return reply.code(403).send({
      code: 'FORBIDDEN',
      message: 'No tienes permisos de administrador',
    });
  }
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Users management
  app.get("/users", { preHandler: adminAuth }, adminController.getAllUsers.bind(adminController));
  app.delete("/users/:userId", { preHandler: adminAuth }, adminController.deleteUser.bind(adminController));

  // Leagues management
  app.get("/leagues", { preHandler: adminAuth }, adminController.getAllLeagues.bind(adminController));
  app.delete("/leagues/:leagueId", { preHandler: adminAuth }, adminController.deleteLeague.bind(adminController));
};
