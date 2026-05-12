export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://lindsey-portfolio-ugc.vercel.app');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.status(500).json({ error: 'Configuration manquante' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=fr&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(502).json({ error: 'Erreur Google API', status: data.status });
    }

    const { reviews = [], rating, user_ratings_total } = data.result;
    const topReviews = reviews
      .filter(r => r.rating >= 4)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    res.status(200).json({ reviews: topReviews, rating, total: user_ratings_total });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
