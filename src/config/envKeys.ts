import fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

// let isDev = process.env.NODE_ENV === "dev";

let fastifyApp = fastify({ logger: true, exposeHeadRoutes: true });
fastifyApp.register(cors, { origin: true });
fastifyApp.register(cookie);

fastifyApp.get("/", (req, res) => {
  res.code(200).send({ message: "Server fired up" });
});

// app.setErrorHandler((err, req, res) => {
//   (err && res.log.error(err),
//     res.code(err?.statusCode || 500).send({
//       message: !isDev ? err?.message : "something broke",
//     }));
// });

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "dev-access-secret";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export const TOTP_ISSUER = process.env.TOTP_ISSUER || "Auth Service";
