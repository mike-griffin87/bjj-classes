import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ---- toggle ----
const DRY_RUN = false;

// candidates: classType "" or "Regular Class"; exclude Seminar/Open Mat
const candidateFilter = {
  classType: { in: ["", "Regular Class"] },
  NOT: { classType: { in: ["Seminar", "Open Mat"] } },
};

async function main() {
  // GI -> Fundamentals (candidates only)
  const giTargets = await prisma.class.findMany({
    where: {
      style: "gi",
      ...candidateFilter,
    },
    select: { id: true, date: true, classType: true, style: true, hours: true },
  });

  // NoGi 1.5h -> Advanced (±0.05h tolerance)
  const nogiTargets = await prisma.class.findMany({
    where: {
      style: "nogi",
      hours: { gte: 1.45, lte: 1.55 },
      ...candidateFilter,
    },
    select: { id: true, date: true, classType: true, style: true, hours: true },
  });

  console.log(`GI → Fundamentals candidates: ${giTargets.length}`);
  console.log(`NoGi ~1.5h → Advanced candidates: ${nogiTargets.length}`);
  console.log("Sample GI ids:", giTargets.slice(0, 5).map(r => r.id));
  console.log("Sample NoGi ids:", nogiTargets.slice(0, 5).map(r => r.id));

  if (DRY_RUN) {
    console.log("DRY RUN — no writes performed.");
  } else {
    const giRes = await prisma.class.updateMany({
      where: {
        id: { in: giTargets.map(r => r.id) },
      },
      data: { classType: "Fundamentals" },
    });

    const nogiRes = await prisma.class.updateMany({
      where: {
        id: { in: nogiTargets.map(r => r.id) },
      },
      data: { classType: "Advanced" },
    });

    console.log(`Updated GI → Fundamentals: ${giRes.count}`);
    console.log(`Updated NoGi → Advanced: ${nogiRes.count}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });