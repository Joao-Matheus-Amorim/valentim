function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || '';
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function buildEvolutionHeaders() {
  const apiKey = readOptionalEnv('EVOLUTION_API_KEY');
  const token = readOptionalEnv('EVOLUTION_TOKEN');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) headers.apikey = apiKey;
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

function getEvolutionConfig() {
  const baseUrl = readOptionalEnv('EVOLUTION_BASE_URL') || readOptionalEnv('EVOLUTION_API_URL');
  const instance = readOptionalEnv('EVOLUTION_INSTANCE');

  if (!baseUrl) throw new Error('EVOLUTION_BASE_URL is not configured');
  if (!instance) throw new Error('EVOLUTION_INSTANCE is not configured');

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    instance
  };
}

function buildEvolutionUrl(path: string) {
  const { baseUrl, instance } = getEvolutionConfig();
  return `${baseUrl}${path.replace('{instance}', encodeURIComponent(instance))}`;
}

export function isEvolutionConfigured() {
  return Boolean((readOptionalEnv('EVOLUTION_BASE_URL') || readOptionalEnv('EVOLUTION_API_URL')) && readOptionalEnv('EVOLUTION_INSTANCE'));
}

export async function sendEvolutionText(input: { to: string; body: string }) {
  const url = buildEvolutionUrl('/message/sendText/{instance}');
  const payload = {
    number: input.to,
    text: input.body
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: buildEvolutionHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution sendText failed: ${res.status} - ${body}`);
  }

  return res.json();
}

export async function fetchEvolutionInstanceStatus() {
  const url = buildEvolutionUrl('/instance/connectionState/{instance}');
  const res = await fetch(url, {
    method: 'GET',
    headers: buildEvolutionHeaders()
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution connectionState failed: ${res.status} - ${body}`);
  }

  return res.json();
}
