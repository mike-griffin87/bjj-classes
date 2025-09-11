import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY_RUN = false; // flip to false to apply

function isSaturday(dateStr: Date | string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 6; // Saturday = 6
}

async function main() {
  const targets = await prisma.class.findMany({
    where: {
      hours: 2,
    },
    select: { id: true, date: true, hours: true, description: true, classType: true },
  });

  const saturdayTargets = targets.filter(c => isSaturday(c.date) && !/bru/i.test(c.description || ""));

  console.log(`Candidates (2h Saturday no "Bru"): ${saturdayTargets.length}`);
  console.log("Sample:", saturdayTargets.slice(0, 5));

  if (!DRY_RUN) {
    const res = await prisma.class.updateMany({
      where: { id: { in: saturdayTargets.map(c => c.id) } },
      data: { classType: "Fundamentals, Open Mat" },
    });
    console.log(`Updated ${res.count} classes.`);
  } else {
    console.log("DRY RUN — no writes performed.");
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });