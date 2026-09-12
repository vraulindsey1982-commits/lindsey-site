// API privée — non liée au site public. Calcule les probabilités "justes"
// (cotes débarrassées de la marge du bookmaker) à partir de cotes réelles
// et repère les meilleures probabilités / value bets.
export default async function handler(req, res) {
  const dashboardSecret = process.env.DASHBOARD_SECRET;
  const providedKey = req.headers['x-dashboard-key'];
  if (!dashboardSecret || providedKey !== dashboardSecret) {
    return res.status(401).json({ error: "Code d'accès invalide" });
  }

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      error: 'ODDS_API_KEY manquante sur Vercel',
      sports: [],
      matches: [],
    });
  }

  const sport = (req.query.sport || 'soccer_epl').toString();
  const region = (req.query.region || 'eu').toString();
  const market = (req.query.market || 'h2h').toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const [sportsRes, oddsRes] = await Promise.all([
      fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`, { signal: controller.signal }),
      fetch(
        `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport)}/odds/?apiKey=${apiKey}&regions=${encodeURIComponent(region)}&markets=${encodeURIComponent(market)}&oddsFormat=decimal`,
        { signal: controller.signal }
      ),
    ]);

    if (!oddsRes.ok) {
      const errBody = await oddsRes.text();
      console.error('Erreur The Odds API', oddsRes.status, errBody);
      return res.status(200).json({ error: 'Erreur en récupérant les cotes', sports: [], matches: [] });
    }

    const sportsData = sportsRes.ok ? await sportsRes.json() : [];
    const oddsData = await oddsRes.json();

    const matches = oddsData.map(event => analyzeEvent(event)).filter(Boolean);

    // Les meilleures probabilités d'abord, puis les meilleures value bets.
    matches.sort((a, b) => b.bestPick.fairProbability - a.bestPick.fairProbability);

    return res.status(200).json({
      sports: sportsData
        .filter(s => s.active)
        .map(s => ({ key: s.key, title: s.title, group: s.group })),
      matches,
    });
  } catch (err) {
    console.error('Erreur serveur paris-analyse', err);
    return res.status(200).json({ error: 'Erreur serveur', sports: [], matches: [] });
  } finally {
    clearTimeout(timeout);
  }
}

// Pour un match : à partir des cotes de chaque bookmaker, calcule la probabilité
// implicite de chaque issue, retire la marge du bookmaker (overround) pour obtenir
// une probabilité "juste", garde la meilleure cote dispo par issue, et calcule
// la value (edge) = probabilité juste x meilleure cote - 1.
function analyzeEvent(event) {
  const bookmakers = event.bookmakers || [];
  if (!bookmakers.length) return null;

  const outcomeStats = new Map(); // nom de l'issue -> { probs: [], bestOdds, bestBookmaker }

  for (const bm of bookmakers) {
    const market = (bm.markets || []).find(m => m.key === 'h2h');
    if (!market || !market.outcomes || !market.outcomes.length) continue;

    const overround = market.outcomes.reduce((sum, o) => sum + 1 / o.price, 0);
    if (!overround) continue;

    for (const outcome of market.outcomes) {
      const impliedProb = 1 / outcome.price;
      const fairProb = impliedProb / overround; // marge retirée

      if (!outcomeStats.has(outcome.name)) {
        outcomeStats.set(outcome.name, { fairProbs: [], bestOdds: 0, bestBookmaker: null });
      }
      const stat = outcomeStats.get(outcome.name);
      stat.fairProbs.push(fairProb);
      if (outcome.price > stat.bestOdds) {
        stat.bestOdds = outcome.price;
        stat.bestBookmaker = bm.title;
      }
    }
  }

  if (!outcomeStats.size) return null;

  const outcomes = Array.from(outcomeStats.entries()).map(([name, stat]) => {
    const fairProbability = average(stat.fairProbs);
    const edge = fairProbability * stat.bestOdds - 1; // valeur espérée par euro misé
    return {
      name,
      fairProbability: round(fairProbability * 100, 1),
      bestOdds: round(stat.bestOdds, 2),
      bestBookmaker: stat.bestBookmaker,
      edgePercent: round(edge * 100, 1),
    };
  });

  outcomes.sort((a, b) => b.fairProbability - a.fairProbability);
  const bestValue = [...outcomes].sort((a, b) => b.edgePercent - a.edgePercent)[0];

  return {
    id: event.id,
    sportKey: event.sport_key,
    sportTitle: event.sport_title,
    commenceTime: event.commence_time,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    bookmakersCount: bookmakers.length,
    outcomes,
    bestPick: outcomes[0],
    bestValuePick: bestValue,
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round(n, decimals) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
