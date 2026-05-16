-- Add recurring task fields
ALTER TABLE "Task" ADD COLUMN "recurringEndDate" DATETIME;
ALTER TABLE "Task" ADD COLUMN "recurringLastGeneratedFor" DATETIME;
ALTER TABLE "Task" ADD COLUMN "recurringParentId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Idempotency guard: prevent duplicate instances for the same series on the same date
CREATE UNIQUE INDEX "Task_recurringParentId_startDate_key"
  ON "Task"("recurringParentId", "startDate");
