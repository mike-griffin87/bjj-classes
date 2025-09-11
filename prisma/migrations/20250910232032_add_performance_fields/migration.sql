-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "classType" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" REAL,
    "style" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performance" TEXT NOT NULL DEFAULT 'NONE',
    "performanceNotes" TEXT
);
INSERT INTO "new_Class" ("classType", "createdAt", "date", "description", "hours", "id", "instructor", "style", "technique", "url") SELECT "classType", "createdAt", "date", "description", "hours", "id", "instructor", "style", "technique", "url" FROM "Class";
DROP TABLE "Class";
ALTER TABLE "new_Class" RENAME TO "Class";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
