import { readSchedule, writeSchedule } from './_lib/scheduleStore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lindsey-ugc.fr');

  const dashboardSecret = process.env.DASHBOARD_SECRET;
  const providedKey = req.headers['x-dashboard-key'];
  if (!dashboardSecret || providedKey !== dashboardSecret) {
    return res.status(401).json({ error: 'Code d\'accès invalide' });
  }

  try {
    if (req.method === 'GET') {
      const data = await readSchedule();
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id requis' });
      const data = await readSchedule();
      const before = data.posts.length;
      data.posts = data.posts.filter(p => p.id !== id);
      if (data.posts.length === before) {
        return res.status(404).json({ error: 'Post introuvable' });
      }
      await writeSchedule(data);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('Erreur scheduled-posts', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
