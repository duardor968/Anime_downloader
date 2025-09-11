// dentro de utils/episodeParser.js
const { makeRequest } = require('./hybridRequest');

async function getEpisodeDownloadLinks(episodePath) {
  const url = episodePath.startsWith('http')
    ? episodePath
    : `https://animeav1.com${episodePath}`;

  const { data } = await makeRequest(url);

  // Buscar la sección downloads y luego SUB dentro de ella
  const downloadsMatch = data.match(/downloads:\{([\s\S]*?)\}\}/);
  if (!downloadsMatch) return [];
  
  const downloadsSection = downloadsMatch[1];
  const subMatch = downloadsSection.match(/SUB:\[([\s\S]*?)\]/);
  if (!subMatch) return [];
  
  const subDownloadsText = subMatch[1];

  const links = [];

  // Buscar enlaces de Mega
  const megaMatch = subDownloadsText.match(/\{server:"Mega",url:"([^"]+)"\}/);
  if (megaMatch) links.push(megaMatch[1]);

  // Buscar enlaces de MP4Upload
  const mp4Match = subDownloadsText.match(/\{server:"MP4Upload",url:"([^"]+)"\}/);
  if (mp4Match) links.push(mp4Match[1]);

  // Buscar enlaces de PDrain (Pixeldrain)
  const pdrainMatch = subDownloadsText.match(/\{server:"PDrain",url:"([^"]+)"\}/);
  if (pdrainMatch) links.push(pdrainMatch[1]);

  return [...new Set(links)];
}

module.exports = { getEpisodeDownloadLinks };