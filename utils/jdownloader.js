const axios = require('axios');
const crypto = require('crypto');
const { getDefaultSettings, normalizeSettings } = require('./settingsStore');

function safeJsonParse(value) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function sanitizePackageName(name) {
  return String(name || 'Anime')
    .replace(/[\\\/:*?"<>|]/g, '')
    .trim() || 'Anime';
}

function createJdError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function normalizeErrorMessage(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (error.userMessage) return error.userMessage;
  return error.message || fallbackMessage;
}

function normalizeDevice(device) {
  const status = String(device && device.status ? device.status : '').trim().toUpperCase();
  const id = String(device && device.id ? device.id : '').trim();
  const name = String(device && device.name ? device.name : '').trim();
  const type = String(device && device.type ? device.type : '').trim();
  const unavailableStatuses = new Set(['OFFLINE', 'DISCONNECTED']);

  return {
    id,
    name,
    type,
    status,
    isReachable: Boolean(id) && !unavailableStatuses.has(status)
  };
}

class LocalApiClient {
  constructor(config) {
    this.ip = config.ip;
    this.port = config.port;
    this.baseURL = `http://${this.ip}:${this.port}`;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true,
      responseType: 'text',
      transformResponse: [data => data]
    });
  }

  buildAddLinksPayload(links, packageName) {
    return {
      links: links.join('\r\n'),
      packageName: sanitizePackageName(packageName),
      sourceUrl: 'https://animeav1.com',
      autostart: false,
      autoExtract: false
    };
  }

  async addLinks(links, packageName) {
    if (!Array.isArray(links) || links.length === 0) {
      return { success: false, message: 'No hay enlaces para enviar a JDownloader' };
    }

    const payload = this.buildAddLinksPayload(links, packageName);
    let response;
    try {
      response = await this.api.post('/linkgrabberv2/addLinks', payload);
    } catch (error) {
      throw createJdError('No se pudo conectar con JDownloader local.', {
        code: 'LOCAL_NETWORK_ERROR',
        userMessage: `No se pudo conectar con JDownloader local en ${this.ip}:${this.port}.`
      });
    }

    if (response.status >= 200 && response.status < 300) {
      console.log(`[INFO] Added ${links.length} links to local JDownloader (${this.baseURL})`);
      return { success: true, message: `${links.length} enlaces enviados a JDownloader local` };
    }

    throw createJdError(
      `Error de API local (HTTP ${response.status})`,
      {
        code: 'LOCAL_HTTP_ERROR',
        userMessage: `No se pudo conectar con JDownloader local en ${this.ip}:${this.port}.`
      }
    );
  }

  async testConnection() {
    let response;
    try {
      response = await this.api.get('/jdcheckjson');
    } catch (error) {
      throw createJdError('No se pudo conectar con JDownloader local.', {
        code: 'LOCAL_NETWORK_ERROR',
        userMessage: `No se pudo conectar con JDownloader local en ${this.ip}:${this.port}.`
      });
    }

    if (response.status >= 200 && response.status < 300) {
      const info = safeJsonParse(response.data) || {};
      return {
        success: true,
        mode: 'local',
        message: `Conexion local exitosa en ${this.ip}:${this.port}`,
        info
      };
    }

    throw createJdError(
      `Error de conexion local (HTTP ${response.status})`,
      {
        code: 'LOCAL_HTTP_ERROR',
        userMessage: `No se pudo conectar con JDownloader local en ${this.ip}:${this.port}.`
      }
    );
  }
}

class MyJdWebClient {
  constructor(config, options = {}) {
    this.baseUrl = String(config.baseUrl || 'https://api.jdownloader.org').replace(/\/$/, '');
    this.email = String(config.email || '').trim().toLowerCase();
    this.password = String(config.password || '');
    this.appKey = String(config.appKey || 'animehub-webui').trim() || 'animehub-webui';
    this.deviceId = String(config.deviceId || '').trim();
    this.deviceName = String(config.deviceName || '').trim();
    this.onDeviceSelected = typeof options.onDeviceSelected === 'function' ? options.onDeviceSelected : null;

    this.apiVer = 1;
    this.ridSeed = Date.now();

    this.loginSecret = null;
    this.deviceSecret = null;
    this.serverEncryptionToken = null;
    this.deviceEncryptionToken = null;
    this.sessionToken = null;
    this.regainToken = null;
  }

  nextRid() {
    const now = Date.now();
    this.ridSeed = now > this.ridSeed ? now : this.ridSeed + 1;
    return this.ridSeed;
  }

  sha256(data) {
    return crypto.createHash('sha256').update(data).digest();
  }

  hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
  }

  createSecret(domain) {
    return this.sha256(Buffer.from(`${this.email}${this.password}${String(domain || '').toLowerCase()}`, 'utf8'));
  }

  createEncryptionToken(oldToken, sessionTokenHex) {
    const sessionBytes = Buffer.from(sessionTokenHex, 'hex');
    return this.sha256(Buffer.concat([oldToken, sessionBytes]));
  }

  encryptAesBase64(plainText, token) {
    const iv = token.subarray(0, 16);
    const key = token.subarray(16, 32);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]).toString('base64');
  }

  decryptAesBase64(cipherText, token) {
    const iv = token.subarray(0, 16);
    const key = token.subarray(16, 32);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    return Buffer.concat([decipher.update(cipherText, 'base64'), decipher.final()]).toString('utf8');
  }

  buildQueryString(paramsEntries) {
    return paramsEntries
      .filter((entry) => Array.isArray(entry) && entry.length === 2 && entry[1] !== undefined && entry[1] !== null)
      .map(([key, value]) => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  parseApiError(status, bodyText, options = {}) {
    const parseFromText = (text) => {
      const parsed = safeJsonParse(text);
      return parsed && typeof parsed === 'object' ? parsed : null;
    };

    let parsed = parseFromText(bodyText);
    if (!parsed && options.decryptToken && typeof bodyText === 'string' && bodyText) {
      try {
        const decrypted = this.decryptAesBase64(bodyText, options.decryptToken);
        parsed = parseFromText(decrypted);
      } catch (error) {
        // Ignore decryption errors when trying to parse HTTP error payloads.
      }
    }

    const src = parsed && parsed.src ? String(parsed.src).toUpperCase() : '';
    const type = parsed && parsed.type ? String(parsed.type).toUpperCase() : '';

    const map = {
      AUTH_FAILED: 'Credenciales de My.JDownloader invalidas.',
      TOKEN_INVALID: 'La sesion de My.JDownloader expiro. Reintentando...',
      SESSION: 'La sesion del dispositivo expiro. Reintentando...',
      OFFLINE: 'El dispositivo de My.JDownloader esta desconectado.',
      OVERLOAD: 'El servidor de My.JDownloader esta sobrecargado. Intenta mas tarde.',
      MAINTENANCE: 'My.JDownloader esta en mantenimiento temporal.',
      TOO_MANY_REQUESTS: 'My.JDownloader limito temporalmente la cantidad de requests.'
    };

    const fallbackByStatus = {
      403: 'AUTH_FAILED',
      407: 'TOKEN_INVALID',
      429: 'TOO_MANY_REQUESTS',
      503: 'OVERLOAD',
      504: 'OFFLINE'
    };

    const resolvedType = type || fallbackByStatus[status] || 'MYJD_HTTP_ERROR';

    return createJdError(
      `My.JDownloader error HTTP ${status}`,
      {
        code: resolvedType,
        src: src || 'MYJD',
        status,
        raw: parsed || bodyText,
        userMessage: map[resolvedType] || `Error de My.JDownloader (HTTP ${status}).`
      }
    );
  }

  isTokenError(error) {
    if (!error) return false;
    return ['TOKEN_INVALID', 'SESSION'].includes(String(error.code || '').toUpperCase()) || error.status === 407;
  }

  isOfflineError(error) {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    return ['OFFLINE', 'DEVICE_OFFLINE', 'MYJD_DEVICE_OFFLINE'].includes(code) || error.status === 504;
  }

  async callServer(path, encryptionKey, paramsEntries = []) {
    const rid = this.nextRid();
    const query = this.buildQueryString([...paramsEntries, ['rid', rid]]);
    const unsignedPath = `${path}?${query}`;
    const signature = this.hmacSha256(encryptionKey, unsignedPath);
    const signedPath = `${unsignedPath}&signature=${signature}`;

    let response;
    try {
      response = await axios.get(`${this.baseUrl}${signedPath}`, {
        timeout: 20000,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [data => data]
      });
    } catch (error) {
      throw createJdError('No se pudo contactar el servidor de My.JDownloader.', {
        code: 'MYJD_NETWORK_ERROR',
        userMessage: 'No se pudo contactar el servidor de My.JDownloader.'
      });
    }

    if (response.status !== 200) {
      throw this.parseApiError(response.status, response.data || '', { decryptToken: encryptionKey });
    }

    let decryptedText;
    try {
      decryptedText = this.decryptAesBase64(response.data || '', encryptionKey);
    } catch (error) {
      throw createJdError('No se pudo descifrar la respuesta de My.JDownloader.', {
        code: 'MYJD_DECRYPT_FAILED',
        userMessage: 'La respuesta de My.JDownloader no se pudo descifrar.'
      });
    }

    const parsed = safeJsonParse(decryptedText);
    if (!parsed || typeof parsed !== 'object') {
      throw createJdError('Respuesta invalida de My.JDownloader.', {
        code: 'MYJD_INVALID_RESPONSE',
        userMessage: 'My.JDownloader devolvio una respuesta invalida.'
      });
    }

    if (Object.prototype.hasOwnProperty.call(parsed, 'rid') && Number(parsed.rid) !== rid) {
      throw createJdError('My.JDownloader devolvio un RID invalido.', {
        code: 'MYJD_INVALID_RID',
        userMessage: 'La respuesta de My.JDownloader no coincide con la solicitud enviada.'
      });
    }

    return parsed;
  }

  async connect() {
    if (!this.email || !this.password) {
      throw createJdError('Faltan credenciales de My.JDownloader.', {
        code: 'MYJD_MISSING_CREDENTIALS',
        userMessage: 'Debes configurar email y password para usar My.JDownloader.'
      });
    }

    this.loginSecret = this.createSecret('server');
    this.deviceSecret = this.createSecret('device');

    const response = await this.callServer(
      '/my/connect',
      this.loginSecret,
      [
        ['email', this.email],
        ['appkey', this.appKey]
      ]
    );

    const sessionToken = response.sessiontoken || response.sessionToken;
    const regainToken = response.regaintoken || response.regainToken;

    if (!sessionToken || !regainToken) {
      throw createJdError('My.JDownloader no devolvio tokens de sesion.', {
        code: 'MYJD_MISSING_TOKENS',
        userMessage: 'No se pudo iniciar sesion en My.JDownloader.'
      });
    }

    this.sessionToken = String(sessionToken);
    this.regainToken = String(regainToken);
    this.serverEncryptionToken = this.createEncryptionToken(this.loginSecret, this.sessionToken);
    this.deviceEncryptionToken = this.createEncryptionToken(this.deviceSecret, this.sessionToken);
  }

  async reconnect() {
    if (!this.sessionToken || !this.regainToken || !this.serverEncryptionToken || !this.deviceSecret) {
      await this.connect();
      return;
    }

    const response = await this.callServer(
      '/my/reconnect',
      this.serverEncryptionToken,
      [
        ['sessiontoken', this.sessionToken],
        ['regaintoken', this.regainToken]
      ]
    );

    const sessionToken = response.sessiontoken || response.sessionToken;
    const regainToken = response.regaintoken || response.regainToken;

    if (!sessionToken || !regainToken) {
      throw createJdError('My.JDownloader no devolvio tokens al reconectar.', {
        code: 'MYJD_RECONNECT_FAILED',
        userMessage: 'No se pudo renovar la sesion de My.JDownloader.'
      });
    }

    this.sessionToken = String(sessionToken);
    this.regainToken = String(regainToken);
    this.serverEncryptionToken = this.createEncryptionToken(this.serverEncryptionToken, this.sessionToken);
    this.deviceEncryptionToken = this.createEncryptionToken(this.deviceSecret, this.sessionToken);
  }

  async ensureConnected() {
    if (this.sessionToken && this.serverEncryptionToken && this.deviceEncryptionToken) {
      return;
    }
    await this.connect();
  }

  async disconnect() {
    if (!this.sessionToken || !this.serverEncryptionToken) return;
    try {
      await this.callServer('/my/disconnect', this.serverEncryptionToken, [['sessiontoken', this.sessionToken]]);
    } catch (error) {
      // Disconnect failure should not block the request flow.
    } finally {
      this.sessionToken = null;
      this.regainToken = null;
      this.serverEncryptionToken = null;
      this.deviceEncryptionToken = null;
    }
  }

  async listDevices(allowReconnect = true) {
    await this.ensureConnected();

    try {
      const response = await this.callServer('/my/listdevices', this.serverEncryptionToken, [['sessiontoken', this.sessionToken]]);
      const rawList = Array.isArray(response.list) ? response.list : [];
      return rawList
        .map(normalizeDevice)
        .filter(device => device.id);
    } catch (error) {
      if (allowReconnect && this.isTokenError(error)) {
        await this.reconnect();
        return this.listDevices(false);
      }
      throw error;
    }
  }

  findPreferredDevice(devices) {
    if (!Array.isArray(devices) || devices.length === 0) return null;

    if (this.deviceId) {
      const byId = devices.find(device => device.id === this.deviceId);
      if (byId) return byId;
    }

    if (this.deviceName) {
      const targetName = this.deviceName.toLowerCase();
      const byName = devices.find(device => device.name.toLowerCase() === targetName);
      if (byName) return byName;
    }

    return null;
  }

  getReachableDevices(devices) {
    return Array.isArray(devices)
      ? devices.filter(device => device && device.id && device.isReachable)
      : [];
  }

  persistSelectedDevice(device) {
    if (!device || !device.id) return;

    if (device.id !== this.deviceId || device.name !== this.deviceName) {
      this.deviceId = device.id;
      this.deviceName = device.name;
      if (this.onDeviceSelected) {
        this.onDeviceSelected({ deviceId: this.deviceId, deviceName: this.deviceName });
      }
    }
  }

  createDeviceSelectionError(preferredDevice, alternatives, reasonMessage) {
    const safeAlternatives = Array.isArray(alternatives) ? alternatives : [];
    const requiresSelection = safeAlternatives.length > 0;

    return createJdError(
      reasonMessage || 'El dispositivo seleccionado de My.JDownloader no esta disponible.',
      {
        code: 'MYJD_DEVICE_OFFLINE',
        userMessage: requiresSelection
          ? 'El dispositivo seleccionado se desconecto. Selecciona otro dispositivo para continuar.'
          : 'El dispositivo seleccionado se desconecto y no hay otro disponible.',
        requiresDeviceSelection: requiresSelection,
        availableDevices: safeAlternatives,
        selectedDeviceId: preferredDevice ? preferredDevice.id : this.deviceId,
        selectedDeviceName: preferredDevice ? preferredDevice.name : this.deviceName
      }
    );
  }

  selectDeviceForDeviceCall(devices) {
    if (!Array.isArray(devices) || devices.length === 0) {
      throw createJdError('No hay dispositivos My.JDownloader disponibles.', {
        code: 'MYJD_NO_DEVICES',
        userMessage: 'No hay dispositivos disponibles en tu cuenta de My.JDownloader.'
      });
    }

    const preferred = this.findPreferredDevice(devices);
    const reachable = this.getReachableDevices(devices);

    if (preferred) {
      if (preferred.isReachable) {
        this.persistSelectedDevice(preferred);
        return preferred;
      }

      const alternatives = reachable.filter(device => device.id !== preferred.id);
      throw this.createDeviceSelectionError(preferred, alternatives, 'El dispositivo seleccionado no esta conectado.');
    }

    const selected = reachable[0] || devices[0];
    this.persistSelectedDevice(selected);
    return selected;
  }

  chooseSelectedDeviceForSettings(devices) {
    if (!Array.isArray(devices) || devices.length === 0) {
      return null;
    }

    const preferred = this.findPreferredDevice(devices);
    if (preferred) {
      return preferred;
    }

    const reachable = this.getReachableDevices(devices);
    return reachable[0] || devices[0];
  }

  async scanDevices() {
    const devices = await this.listDevices();
    const selected = this.chooseSelectedDeviceForSettings(devices);

    if (selected) {
      this.persistSelectedDevice(selected);
    }

    return {
      devices,
      selectedDevice: selected || null
    };
  }

  async buildOfflineRecoveryError(currentDevice, fallbackError = null) {
    let alternatives = [];

    try {
      const scanned = await this.scanDevices();
      alternatives = this.getReachableDevices(scanned.devices)
        .filter(device => !currentDevice || device.id !== currentDevice.id);
    } catch (error) {
      alternatives = [];
    }

    const fallbackMessage = fallbackError && fallbackError.userMessage
      ? fallbackError.userMessage
      : 'El dispositivo seleccionado de My.JDownloader no esta disponible.';

    return this.createDeviceSelectionError(currentDevice, alternatives, fallbackMessage);
  }

  async callDevice(action, params, allowReconnect = true) {
    await this.ensureConnected();

    let devices;
    try {
      devices = await this.listDevices();
    } catch (error) {
      if (this.isOfflineError(error)) {
        throw await this.buildOfflineRecoveryError(null, error);
      }
      throw error;
    }

    const selectedDevice = this.selectDeviceForDeviceCall(devices);
    const rid = this.nextRid();
    const payload = {
      apiVer: this.apiVer,
      url: action,
      rid
    };

    if (params !== undefined) {
      payload.params = Array.isArray(params) ? params : [params];
    }

    const encryptedBody = this.encryptAesBase64(JSON.stringify(payload), this.deviceEncryptionToken);
    const endpoint = `${this.baseUrl}/t_${encodeURIComponent(this.sessionToken)}_${encodeURIComponent(selectedDevice.id)}${action}`;

    let response;
    try {
      response = await axios.post(endpoint, encryptedBody, {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/aesjson-jd; charset=utf-8'
        },
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [data => data]
      });
    } catch (error) {
      throw createJdError('No se pudo contactar el dispositivo de My.JDownloader.', {
        code: 'MYJD_DEVICE_NETWORK_ERROR',
        userMessage: 'No se pudo contactar el dispositivo de My.JDownloader.'
      });
    }

    if (response.status !== 200) {
      const apiError = this.parseApiError(response.status, response.data || '', { decryptToken: this.deviceEncryptionToken });

      if (allowReconnect && this.isTokenError(apiError)) {
        await this.reconnect();
        return this.callDevice(action, params, false);
      }

      if (this.isOfflineError(apiError)) {
        throw await this.buildOfflineRecoveryError(selectedDevice, apiError);
      }

      throw apiError;
    }

    let parsed;
    try {
      const decryptedText = this.decryptAesBase64(response.data || '', this.deviceEncryptionToken);
      parsed = safeJsonParse(decryptedText);
    } catch (error) {
      throw createJdError('No se pudo descifrar la respuesta del dispositivo My.JDownloader.', {
        code: 'MYJD_DEVICE_DECRYPT_FAILED',
        userMessage: 'No se pudo descifrar la respuesta del dispositivo.'
      });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw createJdError('Respuesta invalida del dispositivo My.JDownloader.', {
        code: 'MYJD_DEVICE_INVALID_RESPONSE',
        userMessage: 'El dispositivo devolvio una respuesta invalida.'
      });
    }

    if (Object.prototype.hasOwnProperty.call(parsed, 'rid') && Number(parsed.rid) !== rid) {
      throw createJdError('El dispositivo devolvio un RID invalido.', {
        code: 'MYJD_DEVICE_INVALID_RID',
        userMessage: 'La respuesta del dispositivo no coincide con la solicitud enviada.'
      });
    }

    return Object.prototype.hasOwnProperty.call(parsed, 'data') ? parsed.data : parsed;
  }

  buildAddLinksQuery(links, packageName) {
    return {
      links: links.join('\r\n'),
      packageName: sanitizePackageName(packageName),
      sourceUrl: 'https://animeav1.com',
      autostart: false,
      autoExtract: false
    };
  }

  async addLinks(links, packageName) {
    if (!Array.isArray(links) || links.length === 0) {
      return { success: false, message: 'No hay enlaces para enviar a JDownloader' };
    }

    const query = this.buildAddLinksQuery(links, packageName);
    await this.callDevice('/linkgrabberv2/addLinks', [JSON.stringify(query)]);

    console.log(`[INFO] Added ${links.length} links to My.JDownloader`);
    return { success: true, message: `${links.length} enlaces enviados a My.JDownloader` };
  }

  async testConnection() {
    await this.ensureConnected();
    const { devices, selectedDevice } = await this.scanDevices();

    return {
      success: true,
      mode: 'web',
      message: `Conexion web exitosa (${devices.length} dispositivo(s))`,
      devices,
      selectedDeviceId: selectedDevice ? selectedDevice.id : '',
      selectedDeviceName: selectedDevice ? selectedDevice.name : ''
    };
  }
}

class JDownloaderManager {
  constructor(settings, options = {}) {
    this.settings = normalizeSettings(settings || getDefaultSettings());
    this.options = options;
    this.client = this.createClient();
  }

  static fromSettingsStore(settingsStore) {
    return new JDownloaderManager(settingsStore.getSettings(), {
      onDeviceSelected: ({ deviceId, deviceName }) => {
        settingsStore.saveSettings({
          jdownloader: {
            web: {
              deviceId,
              deviceName
            }
          }
        });
      }
    });
  }

  createClient() {
    if (this.settings.jdownloader.mode === 'web') {
      return new MyJdWebClient(this.settings.jdownloader.web, {
        onDeviceSelected: this.options.onDeviceSelected
      });
    }

    return new LocalApiClient(this.settings.jdownloader.local);
  }

  async addLinks(links, packageName) {
    try {
      return await this.client.addLinks(links, packageName);
    } catch (error) {
      throw createJdError(normalizeErrorMessage(error, 'Error enviando enlaces a JDownloader.'), {
        code: error.code || 'JD_ADD_LINKS_FAILED',
        cause: error,
        requiresDeviceSelection: Boolean(error.requiresDeviceSelection),
        availableDevices: Array.isArray(error.availableDevices) ? error.availableDevices : [],
        selectedDeviceId: error.selectedDeviceId || '',
        selectedDeviceName: error.selectedDeviceName || ''
      });
    } finally {
      await this.close();
    }
  }

  async testConnection() {
    try {
      return await this.client.testConnection();
    } catch (error) {
      throw createJdError(normalizeErrorMessage(error, 'Error de conexion con JDownloader.'), {
        code: error.code || 'JD_TEST_CONNECTION_FAILED',
        cause: error
      });
    } finally {
      await this.close();
    }
  }

  async scanDevices() {
    if (!this.client || typeof this.client.scanDevices !== 'function') {
      throw createJdError('El modo actual no permite escanear dispositivos web.', {
        code: 'JD_MODE_NOT_WEB'
      });
    }

    try {
      return await this.client.scanDevices();
    } catch (error) {
      throw createJdError(normalizeErrorMessage(error, 'No se pudieron obtener dispositivos de My.JDownloader.'), {
        code: error.code || 'JD_SCAN_DEVICES_FAILED',
        cause: error
      });
    } finally {
      await this.close();
    }
  }

  async close() {
    if (this.client && typeof this.client.disconnect === 'function') {
      await this.client.disconnect();
    }
  }
}

module.exports = JDownloaderManager;
