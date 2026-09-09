import { publishLinkedIn } from './_lib/linkedin.js';

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

  const { caption, imageUrl } = req.body || {};

  try {
    const postId = await publishLinkedIn(caption, imageUrl);
    return res.status(200).json({ success: true, postId });
  } catch (err) {
    console.error('Erreur linkedin-publish', err);
    return res.status(502).json({ error: err.message || 'Erreur serveur' });
  }
}
