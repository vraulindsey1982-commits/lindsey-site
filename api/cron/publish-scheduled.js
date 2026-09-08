import { readSchedule, writeSchedule } from '../_lib/scheduleStore.js';
import { publishInstagram } from '../_lib/instagram.js';
import { publishFacebook } from '../_lib/facebook.js';
import { publishLinkedIn } from '../_lib/linkedin.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const data = await readSchedule();
    const due = data.posts.filter(p => p.status === 'pending' && p.scheduledDate <= today);

    for (const post of due) {
      try {
        const postId = post.network === 'instagram'
          ? await publishInstagram(post.imageUrl, post.content)
          : post.network === 'facebook'
          ? await publishFacebook(post.imageUrl, post.content)
          : await publishLinkedIn(post.content);
        post.status = 'published';
        post.publishedPostId = postId;
        post.error = null;
      } catch (err) {
        post.status = 'failed';
        post.error = err.message || 'Erreur inconnue';
      }
    }

    if (due.length > 0) {
      await writeSchedule(data);
    }

    return res.status(200).json({ processed: due.length });
  } catch (err) {
    console.error('Erreur cron publish-scheduled', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
