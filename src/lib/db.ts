import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env, isProd } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development.
export const db = globalForPrisma.prisma ?? createClient();
if (!isProd) globalForPrisma.prisma = db;
