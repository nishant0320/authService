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
  passkeyDisable,
  passkeyLoginVerify,
  passkeyRegister,
  passkeyRegisterVerify,
  passless,
  passlessVerify,
  refreshToken,
  register,
  testPassless,
  testPasslessVerify,
  whatsappDisable,
  whatsappEnable,
  whatsappEnableVerify,
  whatsappLoginVerify,
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

  app.post("/whatsapp/enable", authenticate, whatsappEnable);
  app.post("/whatsapp/enable/verify", authenticate, whatsappEnableVerify);
  app.post("/whatsapp/disable", authenticate, whatsappDisable);
  app.post("/whatsapp/login/verify", whatsappLoginVerify);

  app.post("/passkey/register", authenticate, passkeyRegister);
  app.post("/passkey/register/verify", authenticate, passkeyRegisterVerify);
  app.post("/passkey/login/verify", passkeyLoginVerify);
  app.post("/passkey/disable", authenticate, passkeyDisable);
};

export default authRouter;
