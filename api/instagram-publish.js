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

  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!accessToken || !igUserId) {
    console.error('Configuration manquante : IG_ACCESS_TOKEN ou IG_USER_ID');
    return res.status(500).json({ error: 'Configuration Instagram manquante côté serveur' });
  }

  const { imageUrl, caption } = req.body || {};
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl requis' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const graphBase = `https://graph.instagram.com/v21.0/${igUserId}`;

    const createRes = await fetch(`${graphBase}/media`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption || '',
        access_token: accessToken,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      console.error('Erreur création média Instagram', createData);
      return res.status(502).json({ error: createData.error?.message || 'Échec de la création du média' });
    }

    let statusCode = 'IN_PROGRESS';
    for (let attempt = 0; attempt < 8 && statusCode === 'IN_PROGRESS'; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://graph.instagram.com/v21.0/${createData.id}?fields=status_code&access_token=${accessToken}`, { signal: controller.signal });
      const statusData = await statusRes.json();
      statusCode = statusData.status_code || 'ERROR';
    }
    if (statusCode !== 'FINISHED') {
      console.error('Média Instagram non prêt', statusCode);
      return res.status(502).json({ error: `Le média n'était pas prêt à temps (statut : ${statusCode})` });
    }

    const publishRes = await fetch(`${graphBase}/media_publish`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      console.error('Erreur publication Instagram', publishData);
      return res.status(502).json({ error: publishData.error?.message || 'Échec de la publication' });
    }

    return res.status(200).json({ success: true, postId: publishData.id });
  } catch (err) {
    console.error('Erreur serveur instagram-publish', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    clearTimeout(timeout);
  }
}
