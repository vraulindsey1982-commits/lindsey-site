export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lindsey-ugc.fr');

  const dashboardSecret = process.env.DASHBOARD_SECRET;
  const providedKey = req.headers['x-dashboard-key'];
  if (!dashboardSecret || providedKey !== dashboardSecret) {
    return res.status(401).json({ error: 'Code d\'accès invalide' });
  }

  const igToken = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const fbPageId = process.env.FB_PAGE_ID;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const empty = {
    postsThisMonth: 0,
    igFollowers: null,
    fbFans: null,
    avgEngagementRate: null,
    networksConnected: 0,
  };

  try {
    let igFollowers = null;
    let igPosts = [];
    if (igToken && igUserId) {
      const [profileRes, mediaRes] = await Promise.all([
        fetch(`https://graph.instagram.com/v21.0/${igUserId}?fields=followers_count&access_token=${igToken}`, { signal: controller.signal }),
        fetch(`https://graph.instagram.com/v21.0/${igUserId}/media?fields=like_count,comments_count,timestamp&limit=25&access_token=${igToken}`, { signal: controller.signal }),
      ]);
      const profile = await profileRes.json();
      const media = await mediaRes.json();
      igFollowers = profile.followers_count ?? null;
      igPosts = (media.data || []).map(p => ({
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        date: p.timestamp,
      }));
    }

    let fbFans = null;
    let fbPosts = [];
    if (fbToken && fbPageId) {
      const [pageRes, postsRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${fbPageId}?fields=fan_count&access_token=${fbToken}`, { signal: controller.signal }),
        fetch(`https://graph.facebook.com/v21.0/${fbPageId}/posts?fields=created_time,likes.summary(true),comments.summary(true)&limit=25&access_token=${fbToken}`, { signal: controller.signal }),
      ]);
      const page = await pageRes.json();
      const posts = await postsRes.json();
      fbFans = page.fan_count ?? null;
      fbPosts = (posts.data || []).map(p => ({
        likes: p.likes?.summary?.total_count || 0,
        comments: p.comments?.summary?.total_count || 0,
        date: p.created_time,
      }));
    }

    const allPosts = [...igPosts, ...fbPosts];
    const postsThisMonth = allPosts.filter(p => p.date && new Date(p.date) >= startOfMonth).length;

    const totalFollowers = (igFollowers || 0) + (fbFans || 0);
    let avgEngagementRate = null;
    if (allPosts.length && totalFollowers > 0) {
      const rates = allPosts.map(p => ((p.likes + p.comments) / totalFollowers) * 100);
      avgEngagementRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    }

    const networksConnected = (igToken && igUserId ? 1 : 0) + (fbToken && fbPageId ? 1 : 0);

    return res.status(200).json({
      postsThisMonth,
      igFollowers,
      fbFans,
      avgEngagementRate,
      networksConnected,
    });
  } catch (err) {
    console.error('Erreur social-stats', err);
    return res.status(200).json(empty);
  } finally {
    clearTimeout(timeout);
  }
}
