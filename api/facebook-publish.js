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

  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!accessToken || !pageId) {
    console.error('Configuration manquante : FB_PAGE_ACCESS_TOKEN ou FB_PAGE_ID');
    return res.status(500).json({ error: 'Configuration Facebook manquante côté serveur' });
  }

  const { imageUrl, caption } = req.body || {};
  if (!caption && !imageUrl) {
    return res.status(400).json({ error: 'caption ou imageUrl requis' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`;

    const body = imageUrl
      ? { url: imageUrl, caption: caption || '', access_token: accessToken }
      : { message: caption || '', access_token: accessToken };

    const publishRes = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || (!publishData.id && !publishData.post_id)) {
      console.error('Erreur publication Facebook', publishData);
      return res.status(502).json({ error: publishData.error?.message || 'Échec de la publication' });
    }

    return res.status(200).json({ success: true, postId: publishData.post_id || publishData.id });
  } catch (err) {
    console.error('Erreur serveur facebook-publish', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    clearTimeout(timeout);
  }
}
