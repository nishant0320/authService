// import { Router } from "express";
import authRouter from "./authRoutes";

const v1Router = (app: any) => {
  app.register(authRouter, { prefix: "/auth" });
};

export default v1Router;
