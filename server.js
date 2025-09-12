// server.js
const express = require('express');
const app = express();
const path = require('path');

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
    console.log('[INFO] Loading recent animes for home page');
    const { recentEpisodes, recentAnimes, featuredAnimes } = await getRecentAnimes();

    res.render('index', { recentEpisodes, recentAnimes, featuredAnimes });
  } catch (error) {
    console.error('[ERROR] Failed to load home page:', error.message);
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
      console.log(`[INFO] Searching animes with query: ${query}`);
      searchResults = await searchAnimes(query);
    }
    
    res.render('search', { 
      searchResults, 
      query: query || '',
      hasSearched: !!query
    });
  } catch (error) {
    console.error('[ERROR] Search request failed:', error.message);
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
    console.error('[ERROR] API search failed:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});



// Ruta para detalles del anime
app.get('/media/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log(`[INFO] Loading anime details: ${slug}`);
    
    const animeDetails = await getAnimeDetails(slug);
    
    if (!animeDetails) {
      return res.status(404).render('error', { 
        message: 'Anime no encontrado',
        error: { status: 404 }
      });
    }
    
    res.render('anime', { anime: animeDetails });
  } catch (error) {
    console.error(`[ERROR] Failed to load anime details for ${req.params.slug}:`, error.message);
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
  const jdownloader = new JDownloaderManager();

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
  if (ok) {
    console.log(`[INFO] Successfully added ${allLinks.length} links for ${animeName}`);
    res.write(`data: {"msg":"${allLinks.length} enlaces añadidos correctamente","done":true}\n\n`);
  } else {
    console.error(`[ERROR] Failed to add ${allLinks.length} links for ${animeName}`);
    res.write(`data: {"msg":"Error al añadir ${allLinks.length} enlaces","done":true}\n\n`);
  }
  res.end();
});

// Ruta para descargar episodio individual desde la página de inicio
app.post('/download-episode', async (req, res) => {
  const { episodeTitle, episodeLink } = req.body;

  try {
    const jdownloader = new JDownloaderManager();

    // Extraer enlaces del episodio
    const links = await getEpisodeDownloadLinks(episodeLink);
    
    if (links.length === 0) {
      return res.json({ success: false, message: 'No se encontraron enlaces de descarga' });
    }

    // Extraer número de episodio del enlace para crear nombre específico
    const episodeMatch = episodeLink.match(/\/(\d+)\/?$/);
    const episodeNumber = episodeMatch ? episodeMatch[1] : 'Unknown';
    // Evitar duplicar "Episodio" si ya está en el título
    const packageName = episodeTitle.includes('Episodio') 
      ? `${episodeTitle}` 
      : `${episodeTitle} - Episodio ${episodeNumber}`;

    // Enviar a JDownloader
    const success = await jdownloader.addLinks(links, packageName);
    
    if (success) {
      console.log(`[INFO] Successfully added ${links.length} links for ${packageName}`);
    } else {
      console.warn(`[WARN] Failed to add links to JDownloader for ${packageName}`);
    }
    
    res.json({ 
      success, 
      message: success 
        ? `${links.length} enlaces añadidos para ${packageName}` 
        : 'Error al añadir enlaces a JDownloader'
    });
  } catch (error) {
    console.error(`[ERROR] Episode download failed for ${episodeTitle}:`, error.message);
    res.json({ success: false, message: 'Error interno del servidor' });
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error.message);
  console.error('[FATAL] Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  console.error('[FATAL] Promise:', promise);
  process.exit(1);
});

console.log('[INFO] AnimeHub v1.2.0 - Starting server...');
console.log('[INFO] Working directory:', __dirname);
console.log('[INFO] Static files from:', path.join(__dirname, 'public'));
console.log('[INFO] View engine: EJS');
console.log('[INFO] Views directory:', path.join(__dirname, 'views'));

const server = app.listen(3000, () => {
  console.log('[INFO] Server running on http://localhost:3000');
  console.log('[INFO] Press Ctrl+C to stop the server');
});

server.on('error', (error) => {
  console.error('[ERROR] Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('[ERROR] Port 3000 is already in use');
    process.exit(1);
  }
});