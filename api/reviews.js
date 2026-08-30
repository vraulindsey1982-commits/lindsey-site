export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lindsey-ugc.fr');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');

  const empty = { reviews: [], rating: null, total: 0 };
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    console.error('Configuration manquante : GOOGLE_PLACES_API_KEY ou GOOGLE_PLACE_ID');
    return res.status(200).json(empty);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'reviews,rating,userRatingCount',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Erreur Google API', err);
      return res.status(200).json(empty);
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
    console.error('Erreur serveur reviews', err);
    res.status(200).json(empty);
  } finally {
    clearTimeout(timeout);
  }
}
