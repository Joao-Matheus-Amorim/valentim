SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'evolution'
  AND table_name = 'IntegrationSession'
  AND column_name = 'wavoipToken';
