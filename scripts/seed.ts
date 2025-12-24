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

  // Add test data - regular classes + drilling
  const now = new Date();
  const year = now.getFullYear();
  
  // Add some regular classes throughout 2025
  const classData = [
    { date: new Date(year, 0, 5), classType: "Fundamentals", instructor: "Coach A", technique: "Guard", hours: 1, style: "gi" },
    { date: new Date(year, 1, 10), classType: "Advanced", instructor: "Coach B", technique: "Mount", hours: 1.5, style: "nogi" },
    { date: new Date(year, 2, 15), classType: "Fundamentals", instructor: "Coach A", technique: "Escapes", hours: 1, style: "gi" },
    { date: new Date(year, 3, 20), classType: "Competition", instructor: "Coach C", technique: "Takedown", hours: 2, style: "gi" },
    { date: new Date(year, 4, 25), classType: "Fundamentals", instructor: "Coach A", technique: "Guard", hours: 1, style: "gi" },
    { date: new Date(year, 5, 30), classType: "Advanced", instructor: "Coach B", technique: "Transitions", hours: 1.5, style: "nogi" },
    // Drilling sessions
    { date: new Date(year, 0, 8), classType: "Drilling", instructor: "Home", description: "Guard drill", hours: 0.5 },
    { date: new Date(year, 1, 12), classType: "Drilling", instructor: "Gym", description: "Mount escape drill", hours: 1 },
    { date: new Date(year, 2, 18), classType: "Drilling", instructor: "Home", description: "Leg drag drill", hours: 0.75 },
    { date: new Date(year, 3, 22), classType: "Drilling", instructor: "Gym", description: "Armbar drill", hours: 1.25 },
    { date: new Date(year, 4, 28), classType: "Drilling", instructor: "Home", description: "Footlock drill", hours: 0.5 },
    { date: new Date(year, 5, 5), classType: "Drilling", instructor: "Gym", description: "Guard drill", hours: 1 },
  ];

  for (const data of classData) {
    await prisma.class.create({ data: data as any });
  }
  
  console.log(`Created ${classData.length} test classes (including drilling)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });