// utils/jdownloader.js
const axios = require('axios'); // JDownloader es local, no necesita proxy

class JDownloaderManager {
  async addLinks(links, animeName) {
    if (!links.length) return false;

    const payload = {
      links: links.join('\r\n'),
      packageName: animeName.replace(/[\\\/:*?"<>|]/g, ''),
      sourceUrl: 'https://animeav1.com',
      autostart: false,
      autoExtract: false
    };

    try {
      await axios.post(
        'http://localhost:3128/linkgrabberv2/addLinks',
        payload,
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      return true;
    } catch (e) {
      console.error('JDownloader addLinks error:', e.response?.data || e.message);
      return false;
    }
  }
}

module.exports = JDownloaderManager;