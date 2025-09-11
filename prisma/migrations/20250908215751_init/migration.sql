-- CreateTable
CREATE TABLE "Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "classType" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "style" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
