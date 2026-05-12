export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://lindsey-portfolio-ugc.vercel.app');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.status(500).json({ error: 'Configuration manquante' });
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'reviews,rating,userRatingCount',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: 'Erreur Google API', detail: err });
    }

    const data = await response.json();
    const { reviews = [], rating, userRatingCount } = data;

    const topReviews = reviews
      .filter(r => r.rating >= 4)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map(r => ({
        author_name: r.authorAttribution?.displayName ?? 'Anonyme',
        rating: r.rating,
        text: r.text?.text ?? '',
        relative_time_description: r.relativePublishTimeDescription ?? '',
      }));

    res.status(200).json({ reviews: topReviews, rating, total: userRatingCount });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
