// scripts/fix-instructors.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Normalize helper – catches "kieran", "Kieran  ", etc. (but not "Kieran OD")
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

async function main() {
  // Find rows that are exactly "Kieran" after trim/case-normalization
  const rows = await prisma.class.findMany({
    select: { id: true, instructor: true },
  });

  const toFix = rows.filter((r) => norm(r.instructor) === "kieran");
  console.log(`Will update ${toFix.length} rows -> "Kieran Davern"`);

  if (toFix.length === 0) return;

  const ids = toFix.map((r) => r.id);
  const res = await prisma.class.updateMany({
    where: { id: { in: ids } },
    data: { instructor: "Kieran Davern" },
  });

  console.log(`Updated ${res.count} rows ✅`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });