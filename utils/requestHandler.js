// utils/requestHandler.js
const axios = require('axios');
const retry = require('async-retry');

async function performRequest(url, options = {}) {
  try {
    return await retry(
      async () => await axios(url, options),
      { retries: 3, onRetry: error => console.log(`Reintentando por ${error.message}`) }
    );
  } catch (error) {
    console.error('Error después de varios reintentos:', error);
    throw error;
  }
}

module.exports = { performRequest };