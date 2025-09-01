// utils/hybridRequest.js
const axios = require('axios');
const { spawn } = require('child_process');
const { getSystemProxy } = require('./proxyConfig');

// Función para hacer request con curl como fallback
async function makeRequest(url, options = {}) {
  const proxyConfig = getSystemProxy();
  
  // Primero intentar con axios nativo
  try {
    const axiosConfig = {
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    };

    // Configurar proxy si está disponible
    if (proxyConfig.http || proxyConfig.https) {
      const proxyUrl = proxyConfig.https || proxyConfig.http;
      const url_obj = new URL(proxyUrl);
      
      axiosConfig.proxy = {
        protocol: url_obj.protocol.replace(':', ''),
        host: url_obj.hostname,
        port: parseInt(url_obj.port) || 8080
      };
    }

    const response = await axios.get(url, axiosConfig);
    
    // Si la respuesta es exitosa, devolverla
    if (response.status === 200) {
      return response;
    }
    
    // Si no es exitosa, intentar con curl
    throw new Error(`HTTP ${response.status}`);
    
  } catch (axiosError) {
    console.log(`⚠️  Axios falló (${axiosError.message}), intentando con curl...`);
    
    // Fallback a curl
    return await makeRequestWithCurl(url, options);
  }
}

// Función para hacer request con curl
function makeRequestWithCurl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proxyConfig = getSystemProxy();
    const args = ['-s', '-L']; // -s silencioso, -L seguir redirects
    
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
    
    const curl = spawn('curl', args);
    let data = '';
    let error = '';
    
    curl.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    curl.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        // Simular respuesta de axios
        resolve({
          status: 200,
          data: data,
          headers: { 'content-type': 'text/html' }
        });
      } else {
        reject(new Error(`curl failed with code ${code}: ${error}`));
      }
    });
    
    curl.on('error', (err) => {
      reject(new Error(`curl spawn error: ${err.message}`));
    });
  });
}

module.exports = { makeRequest };