// export interface AuthUser {
//   id: string;
//   email: string;
//   role: string;
// }

// declare global {
//   namespace Fastify {
//     interface FastifyRequest {
//       user?: AuthUser;
//     }
//   }
// }

import "fastify";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}
