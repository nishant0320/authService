// import { Router } from "express";
import v1Router from "./v1/v1Routes";

const apiRouter = (app: any) => {
  app.register(v1Router, { prefix: "/v1" });
};

export default apiRouter;
