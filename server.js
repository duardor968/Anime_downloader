// server.js
const express = require('express');
const app = express();
const path = require('path');

const { getRecentAnimes, searchAnimes, getAnimeDetails, getAvailableFilters, searchAnimesWithFilters } = require('./utils/animeScraper');
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



// API endpoint para obtener filtros
app.get('/api/filters', async (req, res) => {
  try {
    const filters = await getAvailableFilters();
    res.json({ success: true, filters });
  } catch (error) {
    console.error('[ERROR] Failed to get filters:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});



// Helper function for pagination URLs
function buildPaginationUrl(page, query) {
  const params = new URLSearchParams();
  
  // Add all current query parameters except page
  Object.keys(query).forEach(key => {
    if (key !== 'page' && query[key]) {
      params.set(key, query[key]);
    }
  });
  
  // Add the new page
  params.set('page', page);
  
  return '?' + params.toString();
}

app.get('/search', async (req, res) => {
  try {
    const {
      q: query = '',
      page = 1,
      category = '',
      genre = '',
      year = '',
      minYear = '',
      maxYear = '',
      status = '',
      letter = '',
      order = 'default'
    } = req.query;
    
    console.log('[INFO] Loading search/catalog with filters:', req.query);
    
    // Obtener filtros disponibles
    const filters = await getAvailableFilters();
    
    // Realizar búsqueda con filtros
    const searchOptions = {
      query,
      page: parseInt(page),
      category,
      genre,
      year: year || (minYear && maxYear ? `${minYear}-${maxYear}` : ''),
      minYear,
      maxYear,
      status,
      letter,
      order
    };
    
    const searchData = await searchAnimesWithFilters(searchOptions);
    
    res.render('search', {
      animes: searchData.results,
      pagination: searchData.pagination,
      totalResults: searchData.pagination ? searchData.pagination.totalRecords : 0,
      filters,
      currentCategory: category,
      currentGenre: genre,
      currentYear: year,
      currentMinYear: minYear,
      currentMaxYear: maxYear,
      currentStatus: status,
      currentLetter: letter,
      currentOrder: order,
      query: query || '',
      req,
      buildPaginationUrl
    });
  } catch (error) {
    console.error('[ERROR] Search request failed:', error.message);
    res.render('search', {
      animes: [],
      pagination: null,
      totalResults: 0,
      filters: { categories: [], genres: [], years: [1990, new Date().getFullYear()] },
      currentCategory: '',
      currentGenre: '',
      currentYear: '',
      currentMinYear: '',
      currentMaxYear: '',
      currentStatus: '',
      currentLetter: '',
      currentOrder: 'default',
      query: '',
      req,
      buildPaginationUrl,
      error: 'Error al cargar el catálogo'
    });
  }
});

// API endpoint para búsqueda AJAX con filtros
app.get('/api/search', async (req, res) => {
  try {
    const {
      q: query = '',
      page = 1,
      category = '',
      genre = '',
      year = '',
      status = '',
      letter = '',
      order = 'default'
    } = req.query;
    
    const searchOptions = {
      query,
      page: parseInt(page),
      category,
      genre,
      year,
      status,
      letter,
      order
    };
    
    const searchData = await searchAnimesWithFilters(searchOptions);
    res.json({ 
      success: true, 
      results: searchData.results,
      pagination: searchData.pagination,
      appliedFilters: searchData.appliedFilters
    });
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
    console.error('[ERROR] Port 8000 is already in use');
    process.exit(1);
  }
});