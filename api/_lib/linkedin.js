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

async function uploadLinkedInImage(imageUrl, accessToken, personUrn) {
  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: personUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(registerData.message || 'Échec de l\'enregistrement de l\'image LinkedIn');
  }

  const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const asset = registerData.value?.asset;
  if (!uploadUrl || !asset) {
    throw new Error('Réponse LinkedIn inattendue pour l\'enregistrement de l\'image');
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error('Impossible de récupérer l\'image à envoyer sur LinkedIn');
  }
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuffer,
  });
  if (!putRes.ok) {
    throw new Error('Échec de l\'envoi de l\'image vers LinkedIn');
  }

  return asset;
}

export async function publishLinkedIn(caption, imageUrl) {
  const accessToken = process.env.LI_ACCESS_TOKEN;
  const personUrn = process.env.LI_PERSON_URN;
  if (!accessToken || !personUrn) {
    throw new Error('Configuration LinkedIn manquante côté serveur');
  }
  if (!caption) {
    throw new Error('caption requis');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const shareContent = {
      shareCommentary: { text: caption },
      shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
    };

    if (imageUrl) {
      const asset = await uploadLinkedInImage(imageUrl, accessToken, personUrn);
      shareContent.media = [{ status: 'READY', media: asset }];
    }

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
        specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Échec de la publication LinkedIn');
    }
    return res.headers.get('x-restli-id') || 'ok';
  } finally {
    clearTimeout(timeout);
  }
}
