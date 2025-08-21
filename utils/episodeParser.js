// dentro de utils/episodeParser.js
const axios = require('axios');

async function getEpisodeDownloadLinks(episodePath) {
  const url = episodePath.startsWith('http')
    ? episodePath
    : `https://animeav1.com${episodePath}`;

  const { data } = await axios.get(url);

  // 1️⃣  solo la sección SUB
  const m = data.match(/SUB\s*:\s*\[([\s\S]*?)\]/);
  if (!m) return [];

  const subBlock = m[1];

  // 2️⃣  coger desde https://… hasta el primer }
  //     grupo 1 = la URL sin el }
  const urlRegex = /(https?:\/\/(?:pixeldrain\.com|mega\.nz)[^}]*)/g;
  const links = [];

  let match;
  while ((match = urlRegex.exec(subBlock)) !== null) {
    links.push(match[1].slice(0, -1));
  }

  // 3️⃣  limpiar duplicados
  return [...new Set(links)];
}

module.exports = { getEpisodeDownloadLinks };