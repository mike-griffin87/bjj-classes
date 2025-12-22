import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();

function weekday(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "long" });
}

async function main() {
  const raw = await prisma.class.findMany({
    select: { id: true, date: true, hours: true, style: true, classType: true },
    orderBy: { date: "asc" },
  });
  const classes = raw.filter(c => /regular class/i.test(c.classType ?? ""));

  console.log("Remaining Regular Class entries:", classes.length);
  console.table(
    classes.map(c => ({
      id: c.id,
      date: c.date,
      weekday: weekday(c.date),
      hours: c.hours,
      style: c.style,
      classType: c.classType,
    }))
  );

  // also export to CSV
  const header = "id,date,weekday,hours,style,classType\n";
  const rows = classes
    .map(
      c =>
        `${c.id},${c.date},${weekday(c.date)},${c.hours ?? ""},${c.style ?? ""},${c.classType ?? ""}`
    )
    .join("\n");
  fs.writeFileSync("regular-class-list.csv", header + rows);
  console.log('CSV written to regular-class-list.csv');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });