import { FastifyPluginAsync } from "fastify";
import * as AuthController from "../controllers/auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", AuthController.register);
  app.post("/login", AuthController.login);
  app.post("/refresh", AuthController.refresh);
  app.get("/me", { preHandler: app.auth }, AuthController.me);
  app.patch("/update-profile", { preHandler: app.auth }, AuthController.updateProfile);
  app.post("/change-password", { preHandler: app.auth }, AuthController.changePassword);
  app.delete("/delete-account", { preHandler: app.auth }, AuthController.deleteAccount);

  // Reset por código
  app.post("/request-reset-code", AuthController.requestResetCode);
  app.post("/verify-reset-code", AuthController.verifyResetCode);
  app.post("/set-new-password", AuthController.setNewPassword);
};
