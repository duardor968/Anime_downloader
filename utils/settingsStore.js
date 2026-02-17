const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_SETTINGS = Object.freeze({
  audioPreference: 'SUB',
  jdownloader: {
    mode: 'local',
    local: {
      ip: '127.0.0.1',
      port: 3128
    },
    web: {
      baseUrl: 'https://api.jdownloader.org',
      email: '',
      password: '',
      appKey: 'animehub-webui',
      deviceId: '',
      deviceName: ''
    }
  }
});

function cloneSettings(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeAudioPreference(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'DUB' ? 'DUB' : 'SUB';
}

function normalizeMode(value) {
  return String(value || '').trim().toLowerCase() === 'web' ? 'web' : 'local';
}

function normalizeIp(value) {
  const text = String(value || '').trim();
  return text || '127.0.0.1';
}

function normalizePort(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return 3128;
  }
  return parsed;
}

function normalizeOptionalText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeOptionalText(value).toLowerCase();
}

function normalizeAppKey(value) {
  const appKey = normalizeOptionalText(value);
  return appKey || 'animehub-webui';
}

function normalizeBaseUrl(value) {
  const raw = normalizeOptionalText(value);
  const fallback = 'https://api.jdownloader.org';
  const candidate = raw || fallback;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    try {
      parsed = new URL(`https://${candidate}`);
    } catch (secondError) {
      return fallback;
    }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return fallback;
  }

  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function getDefaultSettingsPath() {
  if (process.platform === 'win32') {
    const root = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(root, 'AnimeHub', 'settings.json');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'AnimeHub', 'settings.json');
  }

  const xdgRoot = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgRoot, 'animehub', 'settings.json');
}

function getDefaultSettings() {
  return cloneSettings(DEFAULT_SETTINGS);
}

function mergeSettings(current, patch) {
  const base = cloneSettings(current || DEFAULT_SETTINGS);
  const incoming = ensureObject(patch);

  if (Object.prototype.hasOwnProperty.call(incoming, 'audioPreference')) {
    base.audioPreference = incoming.audioPreference;
  }

  const incomingJd = ensureObject(incoming.jdownloader);
  base.jdownloader = ensureObject(base.jdownloader);

  if (Object.prototype.hasOwnProperty.call(incomingJd, 'mode')) {
    base.jdownloader.mode = incomingJd.mode;
  }

  const incomingLocal = ensureObject(incomingJd.local);
  base.jdownloader.local = ensureObject(base.jdownloader.local);
  if (Object.prototype.hasOwnProperty.call(incomingLocal, 'ip')) {
    base.jdownloader.local.ip = incomingLocal.ip;
  }
  if (Object.prototype.hasOwnProperty.call(incomingLocal, 'port')) {
    base.jdownloader.local.port = incomingLocal.port;
  }

  const incomingWeb = ensureObject(incomingJd.web);
  base.jdownloader.web = ensureObject(base.jdownloader.web);
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'baseUrl')) {
    base.jdownloader.web.baseUrl = incomingWeb.baseUrl;
  }
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'email')) {
    base.jdownloader.web.email = incomingWeb.email;
  }
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'password')) {
    base.jdownloader.web.password = incomingWeb.password;
  }
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'appKey')) {
    base.jdownloader.web.appKey = incomingWeb.appKey;
  }
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'deviceId')) {
    base.jdownloader.web.deviceId = incomingWeb.deviceId;
  }
  if (Object.prototype.hasOwnProperty.call(incomingWeb, 'deviceName')) {
    base.jdownloader.web.deviceName = incomingWeb.deviceName;
  }

  return base;
}

function normalizeSettings(value) {
  const source = ensureObject(value);
  const merged = mergeSettings(DEFAULT_SETTINGS, source);
  const jdownloader = ensureObject(merged.jdownloader);
  const local = ensureObject(jdownloader.local);
  const web = ensureObject(jdownloader.web);

  return {
    audioPreference: normalizeAudioPreference(merged.audioPreference),
    jdownloader: {
      mode: normalizeMode(jdownloader.mode),
      local: {
        ip: normalizeIp(local.ip),
        port: normalizePort(local.port)
      },
      web: {
        baseUrl: normalizeBaseUrl(web.baseUrl),
        email: normalizeEmail(web.email),
        password: normalizeOptionalText(web.password),
        appKey: normalizeAppKey(web.appKey),
        deviceId: normalizeOptionalText(web.deviceId),
        deviceName: normalizeOptionalText(web.deviceName)
      }
    }
  };
}

function writeJsonAtomic(filePath, value) {
  const dirPath = path.dirname(filePath);
  fs.mkdirSync(dirPath, { recursive: true });

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');

  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
    throw error;
  }
}

function createSettingsStore(options = {}) {
  const settingsPath = options.settingsPath || getDefaultSettingsPath();
  let cachedSettings = null;

  function loadSettings() {
    if (!fs.existsSync(settingsPath)) {
      return getDefaultSettings();
    }

    try {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      return normalizeSettings(JSON.parse(raw));
    } catch (error) {
      console.warn('[WARN] Failed to parse settings file, using defaults:', error.message);
      return getDefaultSettings();
    }
  }

  function getSettings() {
    if (!cachedSettings) {
      cachedSettings = loadSettings();
    }
    return cloneSettings(cachedSettings);
  }

  function saveSettings(nextValue) {
    const current = getSettings();
    const merged = mergeSettings(current, ensureObject(nextValue));
    const normalized = normalizeSettings(merged);
    writeJsonAtomic(settingsPath, normalized);
    cachedSettings = normalized;
    return cloneSettings(cachedSettings);
  }

  function replaceSettings(nextValue) {
    const normalized = normalizeSettings(nextValue);
    writeJsonAtomic(settingsPath, normalized);
    cachedSettings = normalized;
    return cloneSettings(cachedSettings);
  }

  return {
    getSettingsPath: () => settingsPath,
    getSettings,
    saveSettings,
    replaceSettings
  };
}

module.exports = {
  DEFAULT_SETTINGS: getDefaultSettings(),
  getDefaultSettings,
  getDefaultSettingsPath,
  mergeSettings,
  normalizeSettings,
  createSettingsStore
};
