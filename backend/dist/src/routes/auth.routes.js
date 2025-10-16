import * as AuthController from "../controllers/auth.controller.js";
export const authRoutes = async (app) => {
    app.post("/register", AuthController.register);
    app.post("/login", AuthController.login);
    app.post("/refresh", AuthController.refresh);
    app.get("/me", { preHandler: app.auth }, AuthController.me);
    app.post("/change-password", { preHandler: app.auth }, AuthController.changePassword);
    // Reset por código
    app.post("/request-reset-code", AuthController.requestResetCode);
    app.post("/verify-reset-code", AuthController.verifyResetCode);
    app.post("/set-new-password", AuthController.setNewPassword);
};
