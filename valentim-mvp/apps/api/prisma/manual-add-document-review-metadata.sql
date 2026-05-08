ALTER TABLE "DocumentRequest"
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE "DocumentRequest"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

ALTER TABLE "DocumentRequest"
ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

CREATE INDEX IF NOT EXISTS "DocumentRequest_reviewedById_idx"
ON "DocumentRequest"("reviewedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DocumentRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "DocumentRequest"
    ADD CONSTRAINT "DocumentRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
