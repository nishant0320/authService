import { Router } from "express";
import {
  changePassword,
  login,
  logout,
  refreshToken,
  register,
} from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh-token", refreshToken);

authRouter.post("/logout", authenticate, logout);
authRouter.post("/change-password", authenticate, changePassword);

export default authRouter;
