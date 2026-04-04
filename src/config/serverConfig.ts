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

export default fastifyApp;
