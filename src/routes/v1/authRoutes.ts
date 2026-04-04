// import { Router } from "express";
import {
  changePassword,
  disableTotp,
  enableTotp,
  githubCallback,
  githubLogin,
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
  verifyTotp,
} from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = (app: any) => {
  app.post("/register", register);
  app.post("/login", login);
  app.post("/refresh-token", refreshToken);

  app.get("/oauth/google", googleLogin);
  app.get("/oauth/google/callback", googleCallback);

  app.get("/oauth/github", githubLogin);
  app.get("/oauth/github/callback", githubCallback);

  app.get("/logout", authenticate, logout);
  app.post("/change-password", authenticate, changePassword);
  app.post("/magic", passless);
  app.get("/magic/verify", passlessVerify);
  app.get("/test/magic", testPassless);
  app.get("/test/magic/verify", testPasslessVerify);
  app.post("/totp/enable", authenticate, enableTotp);
  app.post("/totp/verify", authenticate, verifyTotp);
  app.post("/totp/disable", authenticate, disableTotp);
};

export default authRouter;
