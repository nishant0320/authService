import { Router } from "express";
import authRouter from "./authRoutes";

const v1Router = Router();

v1Router.use("/auth", authRouter);

export default v1Router;
