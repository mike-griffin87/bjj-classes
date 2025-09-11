import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetIdentity() {
  const url = process.env.DATABASE_URL || "";
  try {
    if (url.startsWith("file:")) {
      // Likely SQLite
      // Delete from sqlite_sequence resets AUTOINCREMENT for the table
      await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Class'`);
      console.log("SQLite identity reset for Class.");
    } else if (url.startsWith("postgresql") || url.startsWith("postgres")) {
      // PostgreSQL
      // TRUNCATE with RESTART IDENTITY resets sequences for the truncated tables
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Class" RESTART IDENTITY CASCADE;`);
      console.log("PostgreSQL identity reset for Class via TRUNCATE RESTART IDENTITY.");
    } else if (url.startsWith("mysql")) {
      // MySQL / MariaDB
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE Class;`);
      console.log("MySQL identity reset for Class via TRUNCATE.");
    } else {
      console.warn("Unknown DATABASE_URL provider; skipped identity reset.");
    }
  } catch (e) {
    console.warn("Identity reset failed (non-fatal):", e);
  }
}

async function main() {
  // Clear data first
  await prisma.class.deleteMany();
  console.log("All Class rows deleted.");

  // Attempt to reset auto-increment/sequence
  await resetIdentity();

  console.log("Database cleared, no dummy classes inserted.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });