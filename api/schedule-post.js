import { readSchedule, writeSchedule } from './_lib/scheduleStore.js';

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

  const { network, content, imageUrl, scheduledDate } = req.body || {};
  if (!['instagram', 'facebook'].includes(network)) {
    return res.status(400).json({ error: 'network doit être "instagram" ou "facebook"' });
  }
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content requis' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate || '')) {
    return res.status(400).json({ error: 'scheduledDate doit être au format AAAA-MM-JJ' });
  }
  if (network === 'instagram' && !imageUrl) {
    return res.status(400).json({ error: 'imageUrl requis pour Instagram' });
  }

  try {
    const data = await readSchedule();
    const post = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      network,
      content,
      imageUrl: imageUrl || null,
      scheduledDate,
      status: 'pending',
      publishedPostId: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    data.posts.push(post);
    await writeSchedule(data);
    return res.status(200).json({ success: true, post });
  } catch (err) {
    console.error('Erreur schedule-post', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
