ALTER TABLE evolution."IntegrationSession"
ADD COLUMN IF NOT EXISTS "wavoipToken" TEXT;

ALTER TABLE evolution."Setting"
ADD COLUMN IF NOT EXISTS "wavoipToken" TEXT;
