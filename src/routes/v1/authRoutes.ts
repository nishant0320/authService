// import { Router } from "express";
import { login, logout, refreshToken, register } from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = (app: any) => {
  app.register(register, { prefix: "/register" });
  app.register(login, { prefix: "/login" });
  app.register(refreshToken, { prefix: "/refresh-token" });

  app.register(authenticate, logout, { prefix: "/logout" });
};

export default authRouter;
