// utils/hybridRequest.js
const axios = require('axios');
const { spawn } = require('child_process');
const { getSystemProxy } = require('./proxyConfig');

// Función para hacer request con curl como fallback
async function makeRequest(url, options = {}) {
  // Primero intentar con axios SIN proxy (siempre falla pero es rápido)
  try {
    const axiosConfig = {
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
      // Sin configuración de proxy - axios siempre sin proxy
    };

    const response = await axios.get(url, axiosConfig);
    if (response.status === 200) {
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
    
  } catch (axiosError) {
    console.log(`[WARN] Axios request failed, trying curl fallback`);
    
    // Fallback a curl CON proxy automático
    try {
      return await makeRequestWithCurl(url, options);
    } catch (curlError) {
      console.error(`[ERROR] Network request failed: ${curlError.message}`);
      throw new Error(`Network request failed: ${curlError.message}`);
    }
  }
}

// Función para hacer request con curl
function makeRequestWithCurl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proxyConfig = getSystemProxy();
    const args = ['-s', '-L', '--connect-timeout', '10', '--max-time', '30']; // Timeouts más específicos
    
    // Agregar proxy si está configurado
    if (proxyConfig.http || proxyConfig.https) {
      const proxyUrl = proxyConfig.https || proxyConfig.http;
      args.push('--proxy', proxyUrl);
    }
    
    // Agregar headers
    args.push('-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        args.push('-H', `${key}: ${value}`);
      });
    }
    
    // Agregar URL
    args.push(url);
    
    const curl = spawn('curl', args, { 
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true 
    });
    
    let data = '';
    let error = '';
    
    curl.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    curl.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0 && data.length > 0) {
        // Simular respuesta de axios
        resolve({
          status: 200,
          data: data,
          headers: { 'content-type': 'text/html' }
        });
      } else {
        const errorMsg = error.trim() || `curl failed with code ${code}`;
        reject(new Error(errorMsg));
      }
    });
    
    curl.on('error', (err) => {
      reject(new Error(`curl spawn error: ${err.message}`));
    });
    
    // Timeout de seguridad
    setTimeout(() => {
      curl.kill('SIGTERM');
      reject(new Error('curl timeout after 35 seconds'));
    }, 35000);
  });
}

module.exports = { makeRequest };