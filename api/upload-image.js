import { put } from '@vercel/blob';

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lindsey-ugc.fr');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const dashboardSecret = process.env.DASHBOARD_SECRET;
  const providedKey = req.headers['x-dashboard-key'];
  if (!dashboardSecret || providedKey !== dashboardSecret) {
    return res.status(401).json({ error: 'Code d\'accès invalide' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Configuration manquante : BLOB_READ_WRITE_TOKEN');
    return res.status(500).json({ error: 'Le stockage d\'images n\'est pas configuré côté serveur' });
  }

  const contentType = req.headers['content-type'] || '';
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) {
    return res.status(400).json({ error: 'Format d\'image non supporté (utilise JPG, PNG, WEBP ou GIF)' });
  }

  try {
    const buffer = await readRawBody(req);
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Fichier vide' });
    }
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image trop lourde (8 Mo maximum)' });
    }

    const filename = `lindsey-cm/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Erreur upload image', err);
    return res.status(500).json({ error: 'Échec de l\'envoi de l\'image' });
  }
}
