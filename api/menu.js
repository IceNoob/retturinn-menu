const fetch = require('node-fetch');

const DAYS = ['manudagur', 'thridjudagur', 'midvikudagur', 'fimmtudagur', 'fostudagur'];
const BASE_URL = 'https://www.retturinn.is/matsedill/';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'is,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

async function fetchDayData(day) {
  const url = BASE_URL + day;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const match = html.match(/base64JsonRowData:\s*'([^']+)'/);
    if (!match) return null;

    const raw = JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));
    const dishes = [raw['Réttur 2'] || null, raw['Réttur 3'] || null].filter(Boolean);

    return {
      day: raw['Vikudagur'] || null,
      date: raw['Dagsetning'] || null,
      soup: raw['Réttur 1'] || null,
      dishes: dishes.length > 0 ? dishes : null,
      fixedDishes: raw['Fastir réttir'] || null,
      vegan: raw['Vegan'] || null,
      saladOfTheWeek: raw['Salat vikunnar'] || null,
      fridaySpecial: raw['Föstudagsréttur'] || null,
      specialMessage: raw['SpecMsg'] || null,
    };
  } catch (err) {
    console.warn(`[menu] Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

module.exports = async (req, res) => {
  const results = await Promise.all(DAYS.map(fetchDayData));
  const menu = {};
  DAYS.forEach((day, i) => { menu[day] = results[i]; });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=14400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(menu);
};
