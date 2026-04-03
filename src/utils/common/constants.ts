export const REFRESH_TOKEN_PREFIX = "rt:";
export const ACCESS_TOKEN_PREFIX = "at:";
export const JWT_BLACKLIST_PREFIX = "bl:";

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  NOT_MODIFIED: 304,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,

  ok: 200,
  created: 201,
  noContent: 204,

  notModified: 304,

  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessableEntity: 422,
  tooManyRequests: 429,

  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
} as const;
