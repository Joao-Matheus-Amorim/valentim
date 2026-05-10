DELETE FROM evolution."Session" WHERE "instanceId" IN (
  SELECT id FROM evolution."Instance" WHERE name = 'valentim'
);

DELETE FROM evolution."IntegrationSession" WHERE "instanceId" IN (
  SELECT id FROM evolution."Instance" WHERE name = 'valentim'
);

DELETE FROM evolution."Setting" WHERE "instanceId" IN (
  SELECT id FROM evolution."Instance" WHERE name = 'valentim'
);

DELETE FROM evolution."Instance" WHERE name = 'valentim';
