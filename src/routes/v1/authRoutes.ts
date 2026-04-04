// import { Router } from "express";
import {
  googleCallback,
  googleLogin,
  login,
  logout,
  passless,
  passlessVerify,
  refreshToken,
  register,
  testPassless,
  testPasslessVerify,
} from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = (app: any) => {
  app.post("/register", register);
  app.post("/login", login);
  app.get("/google", googleLogin);
  app.get("/google/callback", googleCallback);
  app.post("/refresh-token", refreshToken);
  app.post("/magic", passless);
  app.get("/test/magic", testPassless);
  app.get("/magic/verify", passlessVerify);
  app.get("/test/magic/verify", testPasslessVerify);
  app.post("/logout", { preHandler: authenticate }, logout);
};

export default authRouter;
