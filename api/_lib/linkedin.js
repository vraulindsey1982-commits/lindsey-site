const REDIRECT_URI = 'https://www.lindsey-ugc.fr/lindsey-cm-dashboard.html';

export async function exchangeLinkedInCode(code) {
  const clientId = process.env.LI_CLIENT_ID;
  const clientSecret = process.env.LI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Configuration LinkedIn manquante côté serveur');
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Échec de l\'échange du code LinkedIn');
  }

  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json();
  if (!userRes.ok || !userData.sub) {
    throw new Error('Échec de la récupération du profil LinkedIn');
  }

  return { accessToken: tokenData.access_token, personUrn: `urn:li:person:${userData.sub}` };
}

export async function publishLinkedIn(caption) {
  const accessToken = process.env.LI_ACCESS_TOKEN;
  const personUrn = process.env.LI_PERSON_URN;
  if (!accessToken || !personUrn) {
    throw new Error('Configuration LinkedIn manquante côté serveur');
  }
  if (!caption) {
    throw new Error('caption requis');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: caption },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Échec de la publication LinkedIn');
    }
    const postId = res.headers.get('x-restli-id') || 'ok';
    return postId;
  } finally {
    clearTimeout(timeout);
  }
}
