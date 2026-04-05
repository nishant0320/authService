import { Router } from "express";
import authRouter from "./authRoutes";
import userRouter from "./userRoutes";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", userRouter);

export default v1Router;
