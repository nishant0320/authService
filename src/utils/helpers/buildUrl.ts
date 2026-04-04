import fastify, { FastifyRequest } from "fastify";

type QueryValue = string | number | boolean | null | undefined;

type BuildUrlOptions = {
  prefix?: string;
  path?: string;
  query?: Record<string, QueryValue>;
};

export function buildUrl(
  req: FastifyRequest,
  { prefix = "", path = "", query = {} }: BuildUrlOptions = {},
) {
  const base = `${req.protocol}://${req.host}`;
  const url = new URL(`${prefix}${path}`, base);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}
