export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lindsey-ugc.fr');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID, 10);

  if (!apiKey || !listId) {
    console.error('Configuration manquante : BREVO_API_KEY ou BREVO_LIST_ID');
    return res.status(500).json({ ok: false, error: 'Service indisponible' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const prenom = String(body.prenom || '').trim().slice(0, 60);

  // Champ piège anti-spam : un humain ne le remplit jamais
  if (body.website) return res.status(200).json({ ok: true });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Adresse email invalide' });
  }
  if (!body.consent) {
    return res.status(400).json({ ok: false, error: 'Consentement requis' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        attributes: prenom ? { PRENOM: prenom } : {},
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!response.ok && response.status !== 204) {
      console.error('Erreur Brevo', response.status, await response.text());
      return res.status(502).json({ ok: false, error: 'Inscription impossible' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erreur Brevo', err);
    return res.status(502).json({ ok: false, error: 'Inscription impossible' });
  }
}
