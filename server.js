// server.js
const express = require('express');
const app = express();
const path = require('path');
const { JDownloaderAPI } = require('jdownloader-api');
const { getRecentAnimes, searchAnimes, getAnimeDetails } = require('./utils/animeScraper');
const JDownloaderManager = require('./utils/jdownloader');
const { performRequest } = require('./utils/requestHandler');
const { getEpisodeDownloadLinks } = require('./utils/episodeParser');
const cheerio = require('cheerio');

// Configuración del usuario
let userConfig = {
  jdownloader: {
    username: '',
    password: ''
  },
  batchSize: 5
};

// Configuración básica
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', async (req, res) => {
  try {
    console.log('Obteniendo animes recientes...');
    const { recentEpisodes, recentAnimes, featuredAnimes } = await getRecentAnimes();

    res.render('index', { recentEpisodes, recentAnimes, featuredAnimes });
  } catch (error) {
    console.error('Error al cargar la página principal:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Redirigir horario a animeav1.com
app.get('/horario', (req, res) => {
  res.redirect('https://animeav1.com/horario');
});

// Redirigir catálogo a animeav1.com
app.get('/catalogo', (req, res) => {
  res.redirect('https://animeav1.com/catalogo');
});

app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    let searchResults = [];
    
    if (query) {
      console.log(`Buscando animes con query: ${query}`);
      searchResults = await searchAnimes(query);
    }
    
    res.render('search', { 
      searchResults, 
      query: query || '',
      hasSearched: !!query
    });
  } catch (error) {
    console.error('Error al manejar la búsqueda:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// API endpoint para búsqueda AJAX
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.json({ success: false, message: 'Query requerido' });
    }
    
    const searchResults = await searchAnimes(query);
    res.json({ success: true, results: searchResults });
  } catch (error) {
    console.error('Error en búsqueda API:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});



// Ruta para detalles del anime
app.get('/media/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log(`Obteniendo detalles del anime: ${slug}`);
    
    const animeDetails = await getAnimeDetails(slug);
    
    if (!animeDetails) {
      return res.status(404).render('error', { 
        message: 'Anime no encontrado',
        error: { status: 404 }
      });
    }
    
    res.render('anime', { anime: animeDetails });
  } catch (error) {
    console.error('Error al cargar detalles del anime:', error);
    res.status(500).render('error', { 
      message: 'Error interno del servidor',
      error: { status: 500 }
    });
  }
});

app.post('/download', async (req, res) => {
  const { animeName, episodes } = req.body;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const total = episodes.length;
  const jdownloader = new JDownloaderManager({
    username: '869lacahc@gmail.com',     // <-- configura tu usuario/password
    password: 'ctsa=m*21'
  });

  // --- PASO 1: extraer enlaces ---
  const allLinks = [];
  for (let i = 0; i < total; i++) {
    const ep = episodes[i];
    res.write(`data: {"msg":"Extrayendo enlaces ${i + 1}/${total}","done":false}\n\n`);

    const links = await require('./utils/episodeParser')
      .getEpisodeDownloadLinks(ep.link);
    allLinks.push(...links);
  }

  // --- PASO 2: enviar a JDownloader ---
  res.write(`data: {"msg":"Enviando ${allLinks.length} enlaces a JDownloader…","done":false}\n\n`);
  const ok = await jdownloader.addLinks(allLinks, animeName);

  // --- PASO 3: fin ---
  res.write(`data: {"msg":"${ok ? '✅' : '❌'} ${allLinks.length} enlaces añadidos","done":true}\n\n`);
  res.end();
});

// Ruta para descargar episodio individual desde la página de inicio
app.post('/download-episode', async (req, res) => {
  const { episodeTitle, episodeLink } = req.body;

  try {
    const jdownloader = new JDownloaderManager({
      username: '869lacahc@gmail.com',
      password: 'ctsa=m*21'
    });

    // Extraer enlaces del episodio
    const links = await getEpisodeDownloadLinks(episodeLink);
    
    if (links.length === 0) {
      return res.json({ success: false, message: 'No se encontraron enlaces de descarga' });
    }

    // Enviar a JDownloader
    const success = await jdownloader.addLinks(links, episodeTitle);
    
    res.json({ 
      success, 
      message: success 
        ? `✅ ${links.length} enlaces añadidos para ${episodeTitle}` 
        : '❌ Error al añadir enlaces a JDownloader'
    });
  } catch (error) {
    console.error('Error al descargar episodio:', error);
    res.json({ success: false, message: 'Error interno del servidor' });
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
});

console.log('🔧 Configurando servidor...');
console.log('📁 Directorio actual:', __dirname);
console.log('📦 Archivos estáticos desde:', path.join(__dirname, 'public'));
console.log('🎨 Motor de vistas: EJS');
console.log('📋 Vistas desde:', path.join(__dirname, 'views'));

const server = app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
  console.log('🌐 Presiona Ctrl+C para detener el servidor');
});

server.on('error', (error) => {
  console.error('Error del servidor:', error);
});