import { FastifyReply, FastifyRequest } from "fastify";

type AsyncHandler = (req: FastifyRequest | any, reply: FastifyReply) => Promise<any>;

const asyncHandler =
  (fn: AsyncHandler) => async (req: FastifyRequest | any, reply: FastifyReply) => {
    return Promise.resolve(fn(req, reply)).catch((err) => {
      throw err;
    });
  };

export default asyncHandler;
