// import { Router } from "express";
import {
  changePassword,
  disableTotp,
  enableTotp,
  login,
  logout,
  passless,
  passlessVerify,
  refreshToken,
  register,
  verifyTotp,
} from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh-token", refreshToken);

authRouter.post("/logout", authenticate, logout);
authRouter.post("/change-password", authenticate, changePassword);

authRouter.post("/totp/enable", authenticate, enableTotp);
authRouter.post("/totp/verify", authenticate, verifyTotp);
authRouter.post("/totp/disable", authenticate, disableTotp);

export default authRouter;
