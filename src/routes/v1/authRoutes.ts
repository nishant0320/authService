import { Router } from "express";
import { login, logout, register } from "../../controllers/authController";
import { authenticate } from "../../middlewares/authMiddleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", authenticate, logout);

export default authRouter;
