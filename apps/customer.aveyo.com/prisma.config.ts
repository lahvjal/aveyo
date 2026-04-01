import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // `prisma generate` does not require a live DB connection.
    // Use a safe fallback to keep local/CI builds from failing when DATABASE_URL is unset.
    url: process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/aveyo",
  },
});
