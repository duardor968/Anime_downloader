// dentro de utils/episodeParser.js
const { makeRequest } = require('./hybridRequest');

const DEFAULT_ALLOWED_SERVERS = Object.freeze(['mega', 'pixeldrain', 'mp4upload']);

function normalizeServerId(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';

  if (text === 'mega' || text === 'mega.nz' || text.includes('mega')) {
    return 'mega';
  }

  if (text === 'pixeldrain' || text === 'pdrain' || text.includes('pixeldrain') || text.includes('pdrain')) {
    return 'pixeldrain';
  }

  if (text === 'mp4upload' || text.includes('mp4upload')) {
    return 'mp4upload';
  }

  if (
    text === '1fichier'
    || text === '1ficher'
    || text === '1fichier.com'
    || text === 'onefichier'
    || text === 'onefichier.com'
    || text.includes('1fichier')
    || text.includes('1ficher')
    || text.includes('onefichier')
  ) {
    return '1fichier';
  }

  return '';
}

function normalizeAllowedServers(allowedServers) {
  if (!Array.isArray(allowedServers) || allowedServers.length === 0) {
    return [...DEFAULT_ALLOWED_SERVERS];
  }

  const normalized = allowedServers
    .map(normalizeServerId)
    .filter(Boolean);
  const unique = [...new Set(normalized)];
  const ordered = ['mega', 'pixeldrain', 'mp4upload', '1fichier']
    .filter(server => unique.includes(server));

  if (ordered.length === 0) {
    return [...DEFAULT_ALLOWED_SERVERS];
  }

  return ordered;
}

function extractDownloadEntries(downloadText) {
  const entries = [];
  const objectMatches = downloadText.match(/\{[^{}]+\}/g) || [];

  objectMatches.forEach((chunk) => {
    const serverMatch = chunk.match(/server:"([^"]+)"/i);
    const urlMatch = chunk.match(/url:"([^"]+)"/i);

    if (!serverMatch || !urlMatch || !urlMatch[1]) {
      return;
    }

    entries.push({
      server: serverMatch[1],
      url: urlMatch[1]
    });
  });

  return entries;
}

async function getEpisodeDownloadLinks(episodePath, audioPreference = 'AUTO', allowedServers = DEFAULT_ALLOWED_SERVERS) {
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

  const selectedServers = normalizeAllowedServers(allowedServers);
  const allowedSet = new Set(selectedServers);
  const entries = extractDownloadEntries(downloadText);

  const links = entries
    .filter((entry) => allowedSet.has(normalizeServerId(entry.server)))
    .map((entry) => entry.url);

  console.log(`[INFO] Found ${audioType} downloads for episode (${selectedServers.join(', ')})`);

  return [...new Set(links)];
}

module.exports = { getEpisodeDownloadLinks };
