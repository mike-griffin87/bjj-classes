import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY_RUN = false;

// Candidates: "Regular Class" or empty
const candidateFilter = {
  OR: [{ classType: "" }, { classType: "Regular Class" }],
  NOT: { classType: { in: ["Seminar", "Open Mat"] } },
};

function getWeekday(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" }); // e.g. "Sat"
}

async function main() {
  const classes = await prisma.class.findMany({
    where: {
      style: "nogi",
      hours: { gte: 0.95, lte: 1.05 }, // ≈ 1h
      ...candidateFilter,
    },
    select: { id: true, date: true, hours: true, classType: true },
  });

  const satIds: number[] = [];
  const tueThuIds: number[] = [];

  for (const c of classes) {
    const d = new Date(c.date);
    const wd = getWeekday(d); // "Tue", "Thu", "Sat"
    if (wd === "Sat") satIds.push(c.id);
    if (wd === "Tue" || wd === "Thu") tueThuIds.push(c.id);
  }

  console.log(`Sat → Fundamentals candidates: ${satIds.length}`);
  console.log(`Tue/Thu → Advanced candidates: ${tueThuIds.length}`);

  if (!DRY_RUN) {
    if (satIds.length) {
      await prisma.class.updateMany({
        where: { id: { in: satIds } },
        data: { classType: "Fundamentals" },
      });
    }
    if (tueThuIds.length) {
      await prisma.class.updateMany({
        where: { id: { in: tueThuIds } },
        data: { classType: "Advanced" },
      });
    }
    console.log("Updates applied.");
  } else {
    console.log("DRY RUN only — no writes.");
  }
}

main().finally(() => prisma.$disconnect());