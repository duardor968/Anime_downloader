// server.js
// Procesar argumentos para proxy personalizado y puerto
const args = process.argv.slice(2);

// Configurar puerto con prioridad: argumento > entorno > hardcodeado
let port = 3000;
const portArgIndex = args.indexOf('--port');
if (portArgIndex !== -1 && portArgIndex + 1 < args.length) {
  port = parseInt(args[portArgIndex + 1]) || 3000;
} else if (process.env.PORT) {
  port = parseInt(process.env.PORT) || 3000;
}

if (args.includes('-p')) {
  const proxyIndex = args.indexOf('-p');
  if (proxyIndex + 1 < args.length) {
    const customProxy = args[proxyIndex + 1];
    process.env.HTTP_PROXY = customProxy;
    process.env.HTTPS_PROXY = customProxy;
    process.env.http_proxy = customProxy;
    process.env.https_proxy = customProxy;
    console.log(`[INFO] Using custom proxy: ${customProxy}`);
  }
} else {
  // Detectar proxy del sistema automáticamente
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpProxy || httpsProxy) {
    console.log(`[INFO] Using system proxy - HTTP: ${httpProxy || 'none'}, HTTPS: ${httpsProxy || 'none'}`);
  } else {
    console.log('[INFO] No proxy detected - running without proxy');
  }
}

// Silenciar warning deprecation de url.parse de dependencias (DEP0169)
process.on('warning', (warning) => {
  if (warning && warning.code === 'DEP0169') return;
  console.warn(warning.stack || warning.message);
});

const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const os = require('os');

const { getRecentAnimes, getAnimeDetails, getAvailableFilters, searchAnimesWithFilters } = require('./utils/animeScraper');
const JDownloaderManager = require('./utils/jdownloader');
const { getEpisodeDownloadLinks } = require('./utils/episodeParser');
const { createSettingsStore, mergeSettings, normalizeSettings } = require('./utils/settingsStore');
const { version } = require('./package.json');

// Detect SEA runtime and prepare embedded assets when available
let assetRoot = __dirname;
try {
  const sea = require('node:sea');
  const manifestJson = sea.getAsset('sea-assets-manifest.json', 'utf8');
  const manifest = JSON.parse(manifestJson);
  const extractionRoot = path.join(os.tmpdir(), 'animehub-sea-assets');
  if (fs.existsSync(extractionRoot)) {
    fs.rmSync(extractionRoot, { recursive: true, force: true });
  }
  for (const rel of manifest.files || []) {
    const destPath = path.join(extractionRoot, rel);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const raw = sea.getAsset(rel);
    const buffer = Buffer.isBuffer(raw)
      ? raw
      : Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw);
    fs.writeFileSync(destPath, buffer);
  }
  assetRoot = extractionRoot;
  console.log('[INFO] SEA runtime detected - assets extracted to', extractionRoot);
} catch (err) {
  // Not running as SEA or assets unavailable; fall back to filesystem.
}

// Configuracion basica
const staticDir = path.join(assetRoot, 'public');
const viewsDir = path.join(assetRoot, 'views');
const settingsStore = createSettingsStore();

app.use(express.static(staticDir));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', viewsDir);

console.log('[INFO] Settings file:', settingsStore.getSettingsPath());

function getRequestedAudioType(audioType, fallbackAudioType) {
  const normalized = String(audioType || '').trim().toUpperCase();
  if (normalized === 'SUB' || normalized === 'DUB') {
    return normalized;
  }
  return fallbackAudioType;
}

function extractSettingsPayload(body) {
  if (body && typeof body === 'object' && body.settings && typeof body.settings === 'object') {
    return body.settings;
  }
  return body && typeof body === 'object' ? body : {};
}

function getWebAccountSnapshot(settings) {
  const web = settings && settings.jdownloader && settings.jdownloader.web
    ? settings.jdownloader.web
    : {};

  return {
    baseUrl: String(web.baseUrl || '').trim(),
    email: String(web.email || '').trim().toLowerCase(),
    password: String(web.password || ''),
    appKey: String(web.appKey || '').trim()
  };
}

function hasWebAccountChanges(previousSettings, nextSettings) {
  const previous = getWebAccountSnapshot(previousSettings);
  const next = getWebAccountSnapshot(nextSettings);
  return previous.baseUrl !== next.baseUrl
    || previous.email !== next.email
    || previous.password !== next.password
    || previous.appKey !== next.appKey;
}

function resetWebDeviceSelection(settings) {
  settings.jdownloader.web.deviceId = '';
  settings.jdownloader.web.deviceName = '';
  return settings;
}

function formatDeviceList(devices) {
  return Array.isArray(devices)
    ? devices
      .filter(device => device && device.id)
      .map(device => ({
        id: String(device.id || ''),
        name: String(device.name || ''),
        type: String(device.type || ''),
        status: String(device.status || ''),
        isReachable: Boolean(device.isReachable)
      }))
    : [];
}

function formatDownloadErrorPayload(error, fallbackMessage) {
  return {
    msg: error.message || fallbackMessage,
    done: true,
    error: true,
    code: error.code || 'DOWNLOAD_FAILED',
    requiresDeviceSelection: Boolean(error.requiresDeviceSelection),
    devices: formatDeviceList(error.availableDevices),
    selectedDeviceId: error.selectedDeviceId || '',
    selectedDeviceName: error.selectedDeviceName || ''
  };
}

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

app.get('/settings', (req, res) => {
  try {
    const settings = settingsStore.getSettings();
    res.render('settings', { settings });
  } catch (error) {
    console.error('[ERROR] Failed to render settings page:', error.message);
    res.status(500).render('error', {
      message: 'Error interno del servidor',
      error: { status: 500 }
    });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    res.json({
      success: true,
      settings: settingsStore.getSettings()
    });
  } catch (error) {
    console.error('[ERROR] Failed to read settings:', error.message);
    res.status(500).json({ success: false, message: 'No se pudo leer la configuracion.' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const currentSettings = settingsStore.getSettings();
    const payload = extractSettingsPayload(req.body);
    let mergedSettings = normalizeSettings(mergeSettings(currentSettings, payload));

    if (mergedSettings.jdownloader.mode === 'web' && hasWebAccountChanges(currentSettings, mergedSettings)) {
      mergedSettings = resetWebDeviceSelection(mergedSettings);
    }

    const savedSettings = settingsStore.replaceSettings(mergedSettings);
    res.json({
      success: true,
      message: 'Configuracion guardada correctamente.',
      settings: savedSettings
    });
  } catch (error) {
    console.error('[ERROR] Failed to save settings:', error.message);
    res.status(400).json({
      success: false,
      message: 'No se pudo guardar la configuracion.'
    });
  }
});

app.post('/api/settings/test-connection', async (req, res) => {
  try {
    const currentSettings = settingsStore.getSettings();
    const payload = extractSettingsPayload(req.body);
    let mergedSettings = normalizeSettings(mergeSettings(currentSettings, payload));

    if (mergedSettings.jdownloader.mode === 'web' && hasWebAccountChanges(currentSettings, mergedSettings)) {
      mergedSettings = resetWebDeviceSelection(mergedSettings);
    }

    const jdownloader = new JDownloaderManager(mergedSettings);
    const result = await jdownloader.testConnection();

    if (result.mode === 'web' && result.selectedDeviceId) {
      mergedSettings.jdownloader.web.deviceId = result.selectedDeviceId;
      mergedSettings.jdownloader.web.deviceName = result.selectedDeviceName || '';
    }

    res.json({
      success: true,
      result,
      settings: mergedSettings
    });
  } catch (error) {
    console.error('[ERROR] Settings connection test failed:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'No se pudo conectar con JDownloader.'
    });
  }
});

app.post('/api/settings/web/devices', async (req, res) => {
  try {
    const currentSettings = settingsStore.getSettings();
    const payload = extractSettingsPayload(req.body);
    let mergedSettings = normalizeSettings(mergeSettings(currentSettings, {
      ...payload,
      jdownloader: {
        ...(payload.jdownloader || {}),
        mode: 'web'
      }
    }));

    if (hasWebAccountChanges(currentSettings, mergedSettings)) {
      mergedSettings = resetWebDeviceSelection(mergedSettings);
    }

    if (!mergedSettings.jdownloader.web.email || !mergedSettings.jdownloader.web.password) {
      return res.status(400).json({
        success: false,
        message: 'Debes completar email y password para validar la cuenta web.'
      });
    }

    const jdownloader = new JDownloaderManager(mergedSettings);
    const scan = await jdownloader.scanDevices();
    const devices = formatDeviceList(scan.devices);

    const selected = scan.selectedDevice && scan.selectedDevice.id
      ? scan.selectedDevice
      : devices[0];

    if (selected && selected.id) {
      mergedSettings.jdownloader.web.deviceId = selected.id;
      mergedSettings.jdownloader.web.deviceName = selected.name || '';
    } else {
      mergedSettings = resetWebDeviceSelection(mergedSettings);
    }

    res.json({
      success: true,
      message: `Cuenta validada. ${devices.length} dispositivo(s) detectado(s).`,
      devices,
      selectedDeviceId: mergedSettings.jdownloader.web.deviceId,
      selectedDeviceName: mergedSettings.jdownloader.web.deviceName,
      settings: mergedSettings
    });
  } catch (error) {
    console.error('[ERROR] Failed to load My.JDownloader devices:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'No se pudo validar la cuenta de My.JDownloader.'
    });
  }
});

app.put('/api/settings/web/device', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const deviceId = String(payload.deviceId || '').trim();

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar un dispositivo.'
      });
    }

    const currentSettings = settingsStore.getSettings();
    const settingsForScan = normalizeSettings(mergeSettings(currentSettings, {
      jdownloader: { mode: 'web' }
    }));

    const jdownloader = new JDownloaderManager(settingsForScan);
    const scan = await jdownloader.scanDevices();
    const devices = formatDeviceList(scan.devices);
    const selectedDevice = devices.find(device => device.id === deviceId);

    if (!selectedDevice) {
      return res.status(404).json({
        success: false,
        message: 'El dispositivo seleccionado ya no esta disponible.',
        devices
      });
    }

    const savedSettings = settingsStore.saveSettings({
      jdownloader: {
        mode: 'web',
        web: {
          deviceId: selectedDevice.id,
          deviceName: selectedDevice.name || ''
        }
      }
    });

    res.json({
      success: true,
      message: `Dispositivo "${selectedDevice.name || selectedDevice.id}" seleccionado.`,
      settings: savedSettings,
      devices
    });
  } catch (error) {
    console.error('[ERROR] Failed to save My.JDownloader device:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'No se pudo guardar el dispositivo seleccionado.'
    });
  }
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
    const settings = settingsStore.getSettings();
    
    if (!animeDetails) {
      return res.status(404).render('error', { 
        message: 'Anime no encontrado',
        error: { status: 404 }
      });
    }
    
    res.render('anime', {
      anime: animeDetails,
      defaultAudioPreference: settings.audioPreference
    });
  } catch (error) {
    console.error(`[ERROR] Failed to load anime details for ${req.params.slug}:`, error.message);
    res.status(500).render('error', { 
      message: 'Error interno del servidor',
      error: { status: 500 }
    });
  }
});

app.post('/download', async (req, res) => {
  const { animeName, episodes, audioType } = req.body;
  const settings = settingsStore.getSettings();
  const preferredAudioType = getRequestedAudioType(audioType, settings.audioPreference);
  const safeEpisodes = Array.isArray(episodes) ? episodes : [];

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const total = safeEpisodes.length;
  const jdownloader = JDownloaderManager.fromSettingsStore(settingsStore);

  if (total === 0) {
    res.write('data: {"msg":"No hay episodios seleccionados","done":true}\n\n');
    res.end();
    return;
  }

  try {
    // --- PASO 1: extraer enlaces ---
    const allLinks = [];
    for (let i = 0; i < total; i++) {
      const ep = safeEpisodes[i];
      if (!ep || !ep.link) continue;
      res.write(`data: {"msg":"Extrayendo enlaces ${i + 1}/${total} (${preferredAudioType})","done":false}\n\n`);

      const links = await getEpisodeDownloadLinks(ep.link, preferredAudioType);
      allLinks.push(...links);
    }

    if (allLinks.length === 0) {
      res.write('data: {"msg":"No se encontraron enlaces de descarga","done":true}\n\n');
      return;
    }

    // --- PASO 2: enviar a JDownloader ---
    res.write(`data: {"msg":"Enviando ${allLinks.length} enlaces a JDownloader...","done":false}\n\n`);
    const result = await jdownloader.addLinks(allLinks, animeName);
    console.log(`[INFO] Successfully added ${allLinks.length} links for ${animeName}`);
    res.write(`data: {"msg":"${result.message}","done":true}\n\n`);
  } catch (error) {
    console.error(`[ERROR] Failed to process batch download for ${animeName}:`, error.message);
    const payload = formatDownloadErrorPayload(error, 'Error al procesar la descarga');
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } finally {
    res.end();
  }
});

// Ruta para descargar episodio individual desde la página de inicio
app.post('/download-episode', async (req, res) => {
  const { episodeTitle, episodeLink, audioType } = req.body;

  try {
    const settings = settingsStore.getSettings();
    const preferredAudioType = getRequestedAudioType(audioType, settings.audioPreference);
    const jdownloader = JDownloaderManager.fromSettingsStore(settingsStore);

    // Extraer enlaces del episodio
    const links = await getEpisodeDownloadLinks(episodeLink, preferredAudioType);
    
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
    const result = await jdownloader.addLinks(links, packageName);
    
    console.log(`[INFO] Successfully added ${links.length} links for ${packageName}`);
    
    res.json({ 
      success: true,
      message: result.message || `${links.length} enlaces añadidos para ${packageName}`
    });
  } catch (error) {
    console.error(`[ERROR] Episode download failed for ${episodeTitle}:`, error.message);
    const payload = formatDownloadErrorPayload(error, 'Error interno del servidor');
    res.json({
      success: false,
      message: payload.msg,
      code: payload.code,
      requiresDeviceSelection: payload.requiresDeviceSelection,
      devices: payload.devices,
      selectedDeviceId: payload.selectedDeviceId,
      selectedDeviceName: payload.selectedDeviceName
    });
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

console.log(`[INFO] AnimeHub v${version} - Starting server...`);
console.log('[INFO] Working directory:', __dirname);
console.log('[INFO] Static files from:', staticDir);
console.log('[INFO] View engine: EJS');
console.log('[INFO] Views directory:', viewsDir);

function startServer(currentPort) {
  const server = app.listen(currentPort, () => {
    console.log(`[INFO] Server running on http://localhost:${currentPort}`);
    console.log('[INFO] Press Ctrl+C to stop the server');
  });

  server.on('error', (error) => {
    console.error('[ERROR] Server error:', error.message);
    if (error.code === 'EADDRINUSE') {
      if (currentPort === 3000 && port === 3000) {
        console.log(`[WARN] Port ${currentPort} is in use, trying port 8000...`);
        startServer(8000);
      } else {
        console.error(`[ERROR] Port ${currentPort} is already in use`);
        process.exit(1);
      }
    }
  });
}

startServer(port);
