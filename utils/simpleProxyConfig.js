// utils/simpleProxyConfig.js
const axios = require('axios');

function getSystemProxy() {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  return {
    http: httpProxy,
    https: httpsProxy,
    noProxy: noProxy ? noProxy.split(',').map(host => host.trim()) : []
  };
}

function createSimpleAxiosInstance() {
  const proxyConfig = getSystemProxy();
  const config = {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  // Configurar proxy usando la configuración nativa de axios
  if (proxyConfig.http || proxyConfig.https) {
    const proxyUrl = proxyConfig.https || proxyConfig.http;
    const url = new URL(proxyUrl);
    
    config.proxy = {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: parseInt(url.port) || 8080
    };
    
    console.log(`🌐 Proxy simple configurado: ${url.hostname}:${config.proxy.port}`);
  }

  return axios.create(config);
}

module.exports = { createSimpleAxiosInstance, getSystemProxy };