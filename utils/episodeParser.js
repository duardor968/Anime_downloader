// dentro de utils/episodeParser.js
const { makeRequest } = require('./hybridRequest');

async function getEpisodeDownloadLinks(episodePath, audioPreference = 'AUTO') {
  const url = episodePath.startsWith('http')
    ? episodePath
    : `https://animeav1.com${episodePath}`;

  const { data } = await makeRequest(url);

  // Buscar la sección downloads
  const downloadsMatch = data.match(/downloads:\{([\s\S]*?)\}\}/);
  if (!downloadsMatch) return [];

  const downloadsSection = downloadsMatch[1];
  const preferredAudio = String(audioPreference || 'AUTO').toUpperCase();

  // Intentar según preferencia
  let downloadText = null;
  let audioType = 'SUB';

  const subMatch = downloadsSection.match(/SUB:\[([\s\S]*?)\]/);
  const dubMatch = downloadsSection.match(/DUB:\[([\s\S]*?)\]/);

  if (preferredAudio === 'SUB') {
    if (subMatch && subMatch[1].trim()) {
      downloadText = subMatch[1];
      audioType = 'SUB';
    }
  } else if (preferredAudio === 'DUB') {
    if (dubMatch && dubMatch[1].trim()) {
      downloadText = dubMatch[1];
      audioType = 'DUB';
    }
  } else {
    // AUTO: SUB primero, luego DUB
    if (subMatch && subMatch[1].trim()) {
      downloadText = subMatch[1];
      audioType = 'SUB';
    } else if (dubMatch && dubMatch[1].trim()) {
      downloadText = dubMatch[1];
      audioType = 'DUB';
    }
  }

  if (!downloadText) return [];

  console.log(`[INFO] Found ${audioType} downloads for episode`);

  const links = [];

  // Buscar enlaces de Mega
  const megaMatch = downloadText.match(/\{server:"Mega",url:"([^"]+)"\}/);
  if (megaMatch) links.push(megaMatch[1]);

  // Buscar enlaces de MP4Upload
  const mp4Match = downloadText.match(/\{server:"MP4Upload",url:"([^"]+)"\}/);
  if (mp4Match) links.push(mp4Match[1]);

  // Buscar enlaces de PDrain (Pixeldrain)
  const pdrainMatch = downloadText.match(/\{server:"PDrain",url:"([^"]+)"\}/);
  if (pdrainMatch) links.push(pdrainMatch[1]);

  return [...new Set(links)];
}

module.exports = { getEpisodeDownloadLinks };
