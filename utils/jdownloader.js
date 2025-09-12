// utils/jdownloader.js
const axios = require('axios');

class JDownloaderManager {
  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:3128',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async addLinks(links, animeName) {
    if (!links.length) return false;

    const packageName = animeName.replace(/[\\\/:*?"<>|]/g, '');
    const payload = {
      links: links.join('\r\n'),
      packageName: packageName,
      sourceUrl: 'https://animeav1.com',
      autostart: false,
      autoExtract: false
    };

    try {
      await this.api.post('/linkgrabberv2/addLinks', payload);
      console.log(`[INFO] Added ${links.length} links to JDownloader`);
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to add links to JDownloader:', error.message);
      return false;
    }
  }
}

module.exports = JDownloaderManager;