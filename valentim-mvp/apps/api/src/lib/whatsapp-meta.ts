const META_API_VERSION = process.env.META_API_VERSION ?? 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function sendWhatsAppText(input: { to: string; body: string }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN não configurado');
  }

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID não configurado');
  }

  const res = await fetch(`${META_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'text',
      text: {
        preview_url: false,
        body: input.body
      }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro ao enviar WhatsApp: ${res.status} — ${body}`);
  }

  return res.json();
}
