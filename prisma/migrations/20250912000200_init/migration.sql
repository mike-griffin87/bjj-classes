-- CreateEnum
CREATE TYPE "public"."Performance" AS ENUM ('NONE', 'POOR', 'AVERAGE', 'EXCELLENT');

-- CreateTable
CREATE TABLE "public"."Class" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "classType" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DOUBLE PRECISION,
    "style" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performance" "public"."Performance" NOT NULL DEFAULT 'NONE',
    "performanceNotes" TEXT,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);
