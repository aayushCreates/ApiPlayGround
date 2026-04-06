import { prisma } from "./db";

export const verifyDbConnection = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("Database connection successful✅✅✅  \n");
  } catch (error) {
    console.error("Database connection failed. Is the database running? ❌❌❌ \n", error);
    process.exit(1);
  }
};
