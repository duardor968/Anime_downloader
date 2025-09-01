// test-hybrid.js
const { makeRequest } = require('./utils/hybridRequest');

async function testHybrid() {
  console.log('🔍 Probando sistema híbrido (axios + curl fallback)...\n');
  
  try {
    console.log('🌐 Probando AnimeAV1...');
    const response = await makeRequest('https://animeav1.com');
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📏 Tamaño: ${response.data.length} caracteres`);
    
    if (response.data.includes('<html') && response.data.includes('</html>')) {
      console.log('✅ Contenido HTML válido recibido');
      
      if (response.data.toLowerCase().includes('anime')) {
        console.log('✅ Contenido de AnimeAV1 detectado');
        console.log('🎯 ¡Conexión exitosa al sitio de anime!');
      }
    }
    
  } catch (error) {
    console.log('❌ Error en la conexión híbrida:');
    console.log(`   ${error.message}`);
  }
}

testHybrid().catch(console.error);