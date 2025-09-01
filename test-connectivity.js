// test-connectivity.js
const { createAxiosInstance, getSystemProxy } = require('./utils/proxyConfig');

async function testConnectivity() {
  console.log('🔍 Probando conectividad a internet...\n');
  
  // Mostrar configuración de proxy
  const proxyConfig = getSystemProxy();
  console.log('📋 Configuración de proxy detectada:');
  console.log(`   HTTP_PROXY: ${proxyConfig.http || 'No configurado'}`);
  console.log(`   HTTPS_PROXY: ${proxyConfig.https || 'No configurado'}`);
  console.log(`   NO_PROXY: ${proxyConfig.noProxy.join(', ') || 'No configurado'}\n`);
  
  const axios = createAxiosInstance();
  
  const testUrls = [
    { name: 'Google', url: 'https://www.google.com', timeout: 5000 },
    { name: 'AnimeAV1', url: 'https://animeav1.com', timeout: 10000 },
    { name: 'GitHub', url: 'https://api.github.com', timeout: 5000 }
  ];
  
  for (const test of testUrls) {
    try {
      console.log(`🌐 Probando conexión a ${test.name} (${test.url})...`);
      const startTime = Date.now();
      
      const response = await axios.get(test.url, { 
        timeout: test.timeout,
        validateStatus: () => true // Aceptar cualquier status code
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ ${test.name}: OK (${response.status}) - ${responseTime}ms`);
      console.log(`   Content-Type: ${response.headers['content-type'] || 'N/A'}`);
      console.log(`   Content-Length: ${response.headers['content-length'] || 'N/A'}\n`);
      
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      if (error.code) {
        console.log(`   Código de error: ${error.code}`);
      }
      if (error.response) {
        console.log(`   Status HTTP: ${error.response.status}`);
      }
      console.log(`   Mensaje: ${error.message}\n`);
    }
  }
  
  // Probar específicamente el endpoint de AnimeAV1 que usa la aplicación
  console.log('🎯 Probando endpoint específico de la aplicación...');
  try {
    const response = await axios.get('https://animeav1.com', {
      timeout: 15000,
      validateStatus: () => true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (response.status === 200) {
      console.log(`✅ AnimeAV1 endpoint: OK (${response.status})`);
    } else {
      console.log(`⚠️  AnimeAV1 endpoint: Status ${response.status}`);
      console.log(`   Primeros 200 caracteres: ${response.data.substring(0, 200)}`);
    }
    console.log(`   Tamaño de respuesta: ${response.data.length} caracteres`);
    
    // Verificar que el contenido es HTML válido
    if (response.data.includes('<html') && response.data.includes('</html>')) {
      console.log('✅ Contenido HTML válido recibido');
    } else {
      console.log('⚠️  El contenido recibido no parece ser HTML válido');
    }
    
  } catch (error) {
    console.log('❌ Error al probar endpoint de AnimeAV1:');
    console.log(`   ${error.message}`);
  }
  
  console.log('\n🏁 Prueba de conectividad completada.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testConnectivity().catch(console.error);
}

module.exports = { testConnectivity };