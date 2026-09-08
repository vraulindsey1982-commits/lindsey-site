export async function publishInstagram(imageUrl, caption) {
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!accessToken || !igUserId) {
    throw new Error('Configuration Instagram manquante côté serveur');
  }
  if (!imageUrl) {
    throw new Error('imageUrl requis');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const graphBase = `https://graph.instagram.com/v21.0/${igUserId}`;

    const createRes = await fetch(`${graphBase}/media`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: caption || '', access_token: accessToken }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      throw new Error(createData.error?.message || 'Échec de la création du média');
    }

    let statusCode = 'IN_PROGRESS';
    for (let attempt = 0; attempt < 8 && statusCode === 'IN_PROGRESS'; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://graph.instagram.com/v21.0/${createData.id}?fields=status_code&access_token=${accessToken}`, { signal: controller.signal });
      const statusData = await statusRes.json();
      statusCode = statusData.status_code || 'ERROR';
    }
    if (statusCode !== 'FINISHED') {
      throw new Error(`Le média n'était pas prêt à temps (statut : ${statusCode})`);
    }

    const publishRes = await fetch(`${graphBase}/media_publish`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      throw new Error(publishData.error?.message || 'Échec de la publication');
    }

    return publishData.id;
  } finally {
    clearTimeout(timeout);
  }
}
