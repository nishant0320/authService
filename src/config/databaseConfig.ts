import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { BCRYPT_SALT_ROUND, DATABASE_URL, NODE_ENV } from "./serverConfig";
import bcrypt from "bcrypt";
import logger from "./loggerConfig";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const basePrisma = new PrismaClient({
  adapter,
  log: NODE_ENV === "development" ? ["error", "query", "warn"] : ["info"],
});

interface UserData {
  password: string;
  [key: string]: string;
}

const SALT_ROUNDS = parseInt(BCRYPT_SALT_ROUND, 10);

async function hashUserPassword(data: UserData): Promise<void> {
  if (data && data.password) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    data.password = await bcrypt.hash(data.password, salt);
  }
}

const prisma = basePrisma.$extends({
  query: {
    user: {
      async create({ args, query }: any) {
        await hashUserPassword(args.data);
        return query(args);
      },
      async update({ args, query }: any) {
        await hashUserPassword(args.data);
        return query(args);
      },
    },
  },
});

function shutDownHandler(signal: string) {
  return async () => {
    logger.info(`Received ${signal}, shutting down gracefully.`);
    await basePrisma.$disconnect();
    logger.info(`Database connection closed.`);
    process.exit(0);
  };
}

process.on("SIGINT", shutDownHandler("SIGINT"));
process.on("SIGTERM", shutDownHandler("SIGTERM"));

export default prisma;
