// dentro de utils/episodeParser.js
const { makeRequest } = require('./hybridRequest');

async function getEpisodeDownloadLinks(episodePath) {
  const url = episodePath.startsWith('http')
    ? episodePath
    : `https://animeav1.com${episodePath}`;

  const { data } = await makeRequest(url);

  // Buscar la sección downloads dentro del JSON
  const downloadsMatch = data.match(/downloads\s*:\s*\{\s*SUB\s*:\s*\[([\s\S]*?)\]/);
  if (!downloadsMatch) return [];

  const downloadsBlock = downloadsMatch[1];
  console.log('Downloads block:', downloadsBlock);

  // Extraer URLs de MP4Upload y otros servidores
  const urlRegex = /url\s*:\s*["'](https?:\/\/(?:www\.)?(?:mp4upload\.com|pixeldrain\.com|mega\.nz)[^"']*)["']/g;
  const links = [];

  let match;
  while ((match = urlRegex.exec(downloadsBlock)) !== null) {
    links.push(match[1]);
  }

  return [...new Set(links)];
}

module.exports = { getEpisodeDownloadLinks };