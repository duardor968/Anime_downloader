// test-simple-proxy.js
const { createSimpleAxiosInstance } = require('./utils/simpleProxyConfig');

async function testSimpleProxy() {
  console.log('🔍 Probando configuración de proxy simplificada...\n');
  
  const axios = createSimpleAxiosInstance();
  
  try {
    console.log('🌐 Probando AnimeAV1 con proxy simple...');
    const response = await axios.get('https://animeav1.com', {
      timeout: 15000,
      validateStatus: () => true
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📏 Tamaño: ${response.data.length} caracteres`);
    
    if (response.status === 200) {
      console.log('✅ ¡Conexión exitosa!');
      
      // Verificar que es contenido HTML válido
      if (response.data.includes('<html') && response.data.includes('</html>')) {
        console.log('✅ Contenido HTML válido recibido');
        
        // Buscar elementos específicos de AnimeAV1
        if (response.data.includes('animeav1') || response.data.includes('anime')) {
          console.log('✅ Contenido de AnimeAV1 detectado');
        }
      }
    } else {
      console.log(`❌ Error: Status ${response.status}`);
      console.log(`Contenido: ${response.data.substring(0, 200)}`);
    }
    
  } catch (error) {
    console.log('❌ Error en la conexión:');
    console.log(`   ${error.message}`);
    if (error.code) {
      console.log(`   Código: ${error.code}`);
    }
  }
}

testSimpleProxy().catch(console.error);