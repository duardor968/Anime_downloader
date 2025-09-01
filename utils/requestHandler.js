// utils/requestHandler.js
const retry = require('async-retry');
const { makeRequest } = require('./hybridRequest');

async function performRequest(url, options = {}) {
  try {
    return await retry(
      async () => await makeRequest(url, options),
      { retries: 3, onRetry: error => console.log(`Reintentando por ${error.message}`) }
    );
  } catch (error) {
    console.error('Error después de varios reintentos:', error);
    throw error;
  }
}

module.exports = { performRequest };