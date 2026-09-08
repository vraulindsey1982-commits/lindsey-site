export async function publishFacebook(imageUrl, caption) {
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!accessToken || !pageId) {
    throw new Error('Configuration Facebook manquante côté serveur');
  }
  if (!caption && !imageUrl) {
    throw new Error('caption ou imageUrl requis');
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
      throw new Error(publishData.error?.message || 'Échec de la publication');
    }

    return publishData.post_id || publishData.id;
  } finally {
    clearTimeout(timeout);
  }
}
