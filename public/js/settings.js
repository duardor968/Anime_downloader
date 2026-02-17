document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');
  const statusBox = document.getElementById('settingsStatus');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const validateWebAccountBtn = document.getElementById('validateWebAccountBtn');
  const refreshWebDevicesBtn = document.getElementById('refreshWebDevicesBtn');
  const webAccountStatus = document.getElementById('webAccountStatus');
  const webDeviceStatus = document.getElementById('webDeviceStatus');
  const webDeviceSection = document.getElementById('webDeviceSection');
  const localSettings = document.getElementById('localSettings');
  const webSettings = document.getElementById('webSettings');

  const inputs = {
    audioPreference: () => document.querySelector('input[name="audioPreference"]:checked'),
    mode: () => document.querySelector('input[name="jdownloaderMode"]:checked'),
    localIp: document.getElementById('localIp'),
    localPort: document.getElementById('localPort'),
    webBaseUrl: document.getElementById('webBaseUrl'),
    webEmail: document.getElementById('webEmail'),
    webPassword: document.getElementById('webPassword'),
    webAppKey: document.getElementById('webAppKey'),
    webDeviceId: document.getElementById('webDeviceId')
  };

  let busyCount = 0;
  let validatedWebAccountFingerprint = '';
  let webAccountValidated = false;

  function getSelectedMode() {
    const selected = inputs.mode();
    return selected ? selected.value : 'local';
  }

  function setBusy(isBusy) {
    busyCount = Math.max(0, busyCount + (isBusy ? 1 : -1));
    const disabled = busyCount > 0;

    [testConnectionBtn, saveSettingsBtn, validateWebAccountBtn, refreshWebDevicesBtn].forEach((button) => {
      if (!button) return;
      button.disabled = disabled;
      button.classList.toggle('opacity-60', disabled);
      button.classList.toggle('cursor-not-allowed', disabled);
    });
  }

  function showStatus(kind, message) {
    if (!statusBox) return;
    statusBox.classList.remove('hidden', 'border-line', 'text-fire', 'text-wins', 'text-info', 'bg-soft');
    statusBox.classList.add('border', 'bg-soft');

    if (kind === 'error') {
      statusBox.classList.add('border-line', 'text-fire');
    } else if (kind === 'success') {
      statusBox.classList.add('border-line', 'text-wins');
    } else {
      statusBox.classList.add('border-line', 'text-info');
    }

    statusBox.textContent = message;
  }

  function collectWebAccountFromForm() {
    return {
      baseUrl: inputs.webBaseUrl.value.trim(),
      email: inputs.webEmail.value.trim().toLowerCase(),
      password: inputs.webPassword.value,
      appKey: inputs.webAppKey.value.trim()
    };
  }

  function getWebAccountFingerprint() {
    const account = collectWebAccountFromForm();
    return JSON.stringify(account);
  }

  function setWebDeviceSectionEnabled(enabled) {
    if (!webDeviceSection) return;

    webDeviceSection.classList.toggle('opacity-60', !enabled);
    if (inputs.webDeviceId) {
      inputs.webDeviceId.disabled = !enabled;
    }

    if (refreshWebDevicesBtn) {
      refreshWebDevicesBtn.disabled = !enabled;
      refreshWebDevicesBtn.classList.toggle('opacity-60', !enabled);
      refreshWebDevicesBtn.classList.toggle('cursor-not-allowed', !enabled);
    }
  }

  function setWebAccountStatus(text, isError = false) {
    if (!webAccountStatus) return;
    webAccountStatus.textContent = text;
    webAccountStatus.classList.remove('text-subs', 'text-fire', 'text-wins');
    webAccountStatus.classList.add(isError ? 'text-fire' : 'text-subs');
  }

  function setWebDeviceStatus(text, isError = false, isSuccess = false) {
    if (!webDeviceStatus) return;
    webDeviceStatus.textContent = text;
    webDeviceStatus.classList.remove('text-subs', 'text-fire', 'text-wins', 'text-info');

    if (isError) {
      webDeviceStatus.classList.add('text-fire');
    } else if (isSuccess) {
      webDeviceStatus.classList.add('text-wins');
    } else {
      webDeviceStatus.classList.add('text-subs');
    }
  }

  function resetDeviceSelection(reason) {
    webAccountValidated = false;
    validatedWebAccountFingerprint = '';
    setWebDeviceSectionEnabled(false);

    if (inputs.webDeviceId) {
      inputs.webDeviceId.innerHTML = '';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = reason || 'Valida la cuenta para listar dispositivos';
      option.selected = true;
      inputs.webDeviceId.appendChild(option);
    }

    setWebDeviceStatus('Pendiente de validar cuenta para poblar dispositivos.');
  }

  function populateDeviceSelect(devices, selectedId) {
    const select = inputs.webDeviceId;
    if (!select) return;

    select.innerHTML = '';
    const normalized = Array.isArray(devices) ? devices : [];

    if (normalized.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay dispositivos disponibles';
      option.selected = true;
      select.appendChild(option);
      return;
    }

    normalized.forEach(device => {
      const option = document.createElement('option');
      option.value = device.id;
      option.dataset.deviceName = device.name || '';

      const status = (device.status || '').trim();
      const statusLabel = status ? ` - ${status}` : '';
      option.textContent = `${device.name || device.id}${statusLabel}`;

      if (selectedId && selectedId === device.id) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    if (!select.value && select.options.length > 0) {
      select.options[0].selected = true;
    }
  }

  function setCheckedRadio(name, value) {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((radio) => {
      radio.checked = radio.value === value;
    });
  }

  function toggleModePanels() {
    const mode = getSelectedMode();

    if (localSettings) {
      localSettings.classList.toggle('hidden', mode !== 'local');
    }

    if (webSettings) {
      webSettings.classList.toggle('hidden', mode !== 'web');
    }
  }

  function applySettings(settings) {
    if (!settings || !settings.jdownloader) return;

    setCheckedRadio('audioPreference', settings.audioPreference || 'SUB');
    setCheckedRadio('jdownloaderMode', settings.jdownloader.mode || 'local');

    inputs.localIp.value = settings.jdownloader.local?.ip || '127.0.0.1';
    inputs.localPort.value = settings.jdownloader.local?.port || 3128;

    inputs.webBaseUrl.value = settings.jdownloader.web?.baseUrl || 'https://api.jdownloader.org';
    inputs.webEmail.value = settings.jdownloader.web?.email || '';
    inputs.webPassword.value = settings.jdownloader.web?.password || '';
    inputs.webAppKey.value = settings.jdownloader.web?.appKey || 'animehub-webui';

    const savedDeviceId = settings.jdownloader.web?.deviceId || '';
    const savedDeviceName = settings.jdownloader.web?.deviceName || '';

    if (savedDeviceId) {
      populateDeviceSelect([{ id: savedDeviceId, name: savedDeviceName, status: '' }], savedDeviceId);
    } else {
      resetDeviceSelection('Valida la cuenta para listar dispositivos');
    }

    const hasAccountData = Boolean(inputs.webEmail.value.trim() && inputs.webPassword.value);
    const fingerprint = getWebAccountFingerprint();

    if (hasAccountData && savedDeviceId) {
      webAccountValidated = true;
      validatedWebAccountFingerprint = fingerprint;
      setWebDeviceSectionEnabled(true);
      setWebAccountStatus('Cuenta lista. Puedes recargar dispositivos cuando quieras.');
      setWebDeviceStatus(`Dispositivo actual: ${savedDeviceName || savedDeviceId}`, false, true);
    } else {
      webAccountValidated = false;
      validatedWebAccountFingerprint = '';
      setWebDeviceSectionEnabled(false);
      setWebAccountStatus('Cuenta pendiente de validar.');
      if (!savedDeviceId) {
        setWebDeviceStatus('Sin dispositivos cargados.');
      }
    }

    toggleModePanels();
  }

  function collectSettingsFromForm() {
    const audio = inputs.audioPreference();
    const mode = getSelectedMode();
    const selectedOption = inputs.webDeviceId.options[inputs.webDeviceId.selectedIndex];

    return {
      audioPreference: audio ? audio.value : 'SUB',
      jdownloader: {
        mode,
        local: {
          ip: inputs.localIp.value.trim(),
          port: Number.parseInt(inputs.localPort.value, 10)
        },
        web: {
          ...collectWebAccountFromForm(),
          deviceId: inputs.webDeviceId.value,
          deviceName: selectedOption ? (selectedOption.dataset.deviceName || selectedOption.textContent.trim()) : ''
        }
      }
    };
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Request failed: ${response.status}`);
    }

    return payload;
  }

  async function testLocalConnection() {
    const settings = collectSettingsFromForm();
    settings.jdownloader.mode = 'local';

    setBusy(true);
    showStatus('info', 'Probando conexion local...');

    try {
      const payload = await requestJson('/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });

      showStatus('success', payload.result?.message || 'Conexion local exitosa.');
    } catch (error) {
      showStatus('error', error.message || 'No se pudo probar la conexion local.');
    } finally {
      setBusy(false);
    }
  }

  async function validateWebAccount() {
    if (getSelectedMode() !== 'web') {
      return;
    }

    const account = collectWebAccountFromForm();
    if (!account.email || !account.password) {
      showStatus('error', 'Completa email y password para validar la cuenta web.');
      setWebAccountStatus('Cuenta invalida: faltan credenciales.', true);
      resetDeviceSelection('Completa email y password para validar');
      return;
    }

    const settings = collectSettingsFromForm();
    settings.jdownloader.mode = 'web';
    settings.jdownloader.web.deviceId = '';
    settings.jdownloader.web.deviceName = '';

    setBusy(true);
    showStatus('info', 'Validando cuenta web...');
    setWebAccountStatus('Validando cuenta y poblando dispositivos...');
    setWebDeviceSectionEnabled(false);
    setWebDeviceStatus('Poblando dispositivos...');

    try {
      const payload = await requestJson('/api/settings/web/devices', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });

      const devices = Array.isArray(payload.devices) ? payload.devices : [];
      populateDeviceSelect(devices, payload.selectedDeviceId || '');

      webAccountValidated = true;
      validatedWebAccountFingerprint = getWebAccountFingerprint();
      setWebDeviceSectionEnabled(true);

      setWebAccountStatus('Cuenta validada correctamente.');
      if (devices.length > 0) {
        setWebDeviceStatus(`Dispositivos cargados: ${devices.length}.`, false, true);
      } else {
        setWebDeviceStatus('Cuenta validada, pero no hay dispositivos disponibles.', true);
      }

      if (payload.settings) {
        applySettings(payload.settings);
      }

      showStatus('success', payload.message || 'Cuenta validada y dispositivos cargados.');
    } catch (error) {
      webAccountValidated = false;
      validatedWebAccountFingerprint = '';
      setWebAccountStatus(error.message || 'No se pudo validar la cuenta.', true);
      resetDeviceSelection('No se pudieron cargar dispositivos');
      showStatus('error', error.message || 'No se pudo validar la cuenta web.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();

    const settings = collectSettingsFromForm();
    const mode = getSelectedMode();

    if (mode === 'web') {
      const fingerprint = getWebAccountFingerprint();
      if (!webAccountValidated || fingerprint !== validatedWebAccountFingerprint) {
        showStatus('error', 'Debes validar la cuenta web antes de guardar.');
        setWebAccountStatus('Vuelve a validar la cuenta para continuar.', true);
        return;
      }

      if (!settings.jdownloader.web.deviceId) {
        showStatus('error', 'Debes seleccionar un dispositivo para modo web.');
        setWebDeviceStatus('Selecciona un dispositivo para guardar.', true);
        return;
      }
    }

    setBusy(true);
    showStatus('info', 'Guardando configuracion...');

    try {
      const payload = await requestJson('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });

      if (payload.settings) {
        applySettings(payload.settings);
      }

      showStatus('success', payload.message || 'Configuracion guardada.');
    } catch (error) {
      showStatus('error', error.message || 'No se pudo guardar la configuracion.');
    } finally {
      setBusy(false);
    }
  }

  function handleWebAccountFieldMutation() {
    if (getSelectedMode() !== 'web') return;

    const currentFingerprint = getWebAccountFingerprint();
    if (!validatedWebAccountFingerprint || currentFingerprint !== validatedWebAccountFingerprint) {
      if (webAccountValidated || inputs.webDeviceId.value) {
        setWebAccountStatus('Cuenta modificada. Vuelve a validar.', true);
        showStatus('info', 'La configuracion de cuenta cambio. Se reinicio la seleccion de dispositivo.');
      }
      resetDeviceSelection('Cuenta modificada. Valida de nuevo para poblar dispositivos');
    }
  }

  document.querySelectorAll('input[name="jdownloaderMode"]').forEach(input => {
    input.addEventListener('change', toggleModePanels);
  });

  [inputs.webBaseUrl, inputs.webEmail, inputs.webPassword, inputs.webAppKey].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', handleWebAccountFieldMutation);
  });

  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testLocalConnection);
  }

  if (validateWebAccountBtn) {
    validateWebAccountBtn.addEventListener('click', validateWebAccount);
  }

  if (refreshWebDevicesBtn) {
    refreshWebDevicesBtn.addEventListener('click', validateWebAccount);
  }

  if (form) {
    form.addEventListener('submit', saveSettings);
  }

  applySettings(window.initialSettings || {});
  toggleModePanels();
});
