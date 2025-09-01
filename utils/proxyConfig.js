// utils/proxyConfig.js
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

function getSystemProxy() {
  // Obtener configuración de proxy del sistema desde variables de entorno
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  return {
    http: httpProxy,
    https: httpsProxy,
    noProxy: noProxy ? noProxy.split(',').map(host => host.trim()) : []
  };
}

function createAxiosInstance() {
  const proxyConfig = getSystemProxy();
  const config = {
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    // Configuración adicional para compatibilidad con proxies corporativos
    validateStatus: function (status) {
      return status >= 200 && status < 300; // Solo aceptar 2xx como éxito
    }
  };

  // Configurar proxy si está disponible
  if (proxyConfig.http || proxyConfig.https) {
    console.log('🌐 Configurando proxy del sistema...');
    
    // Usar el mismo proxy para HTTP y HTTPS
    const proxyUrl = proxyConfig.https || proxyConfig.http;
    
    // Configuración específica para proxies corporativos
    const agentOptions = {
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256
    };
    
    config.httpAgent = new HttpProxyAgent(proxyUrl, agentOptions);
    config.httpsAgent = new HttpsProxyAgent(proxyUrl, agentOptions);
    
    // Configuración de proxy directa como fallback
    config.proxy = {
      protocol: 'http',
      host: proxyUrl.split('://')[1].split(':')[0],
      port: parseInt(proxyUrl.split(':')[2] || '8080'),
      auth: undefined // Sin autenticación por ahora
    };
    
    console.log(`📡 Proxy configurado: ${proxyUrl}`);
  } else {
    console.log('🔍 No se detectó configuración de proxy del sistema');
  }

  return axios.create(config);
}

module.exports = { createAxiosInstance, getSystemProxy };