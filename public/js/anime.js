/* ---------- Paginación de episodios ---------- */
let currentRange = { start: 1, end: 50 };
let allEpisodes = [];

// Inicializar datos de episodios
if (window.animeData?.episodes) {
  allEpisodes = window.animeData.episodes;
}

// Función para mostrar episodios en el rango actual
function showEpisodesInRange(start, end) {
  const container = document.getElementById('episodesContainer');
  if (!container) return;

  // Limpiar contenedor
  container.innerHTML = '';

  // Filtrar episodios en el rango
  const episodesToShow = allEpisodes.filter(ep => {
    const num = parseInt(ep.number);
    return num >= start && num <= end;
  });

  // Generar HTML para cada episodio
  episodesToShow.forEach(episode => {
    const animeId = window.animeData?.animeId || '';
    const screenshotUrl = animeId ? `https://cdn.animeav1.com/screenshots/${animeId}/${episode.number}.jpg` : '';
    
    const episodeHTML = `
      <article class="group/item relative text-text card-surface overflow-hidden" data-episode="${episode.number}">
        <div class="absolute top-3 left-3 z-20">
          <input type="checkbox" id="ep-${episode.number}" value="${episode.link}" class="episode-checkbox">
        </div>

        <figure class="relative overflow-hidden rounded-lg bg-black">
          <img class="aspect-video w-full object-cover transition-all group-hover/item:opacity-75"
               width="300" height="169" loading="lazy"
               src="${screenshotUrl}"
               alt="Episodio ${episode.number}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
          <div class="aspect-video w-full rounded-lg bg-line flex items-center justify-center" style="display:none">
            <i class="fas fa-film text-2xl text-subs"></i>
          </div>

          <div class="badge-stack select-none">
            <span class="badge-chip badge-chip--muted">EP</span>
            <span class="badge-chip badge-chip--main">${episode.number}</span>
          </div>

          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center overlay-dim">
            <button
              class="download-episode-btn bg-main hover:bg-main/80 text-fore w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center"
              data-title="Episodio ${episode.number}" data-link="${episode.link}"
              title="Descargar Episodio ${episode.number}">
              <i class="fas fa-download text-xl"></i>
            </button>
          </div>
        </figure>
      </article>
    `;
    
    container.insertAdjacentHTML('beforeend', episodeHTML);
  });

  // Actualizar el texto del rango actual
  const currentRangeElement = document.getElementById('currentRange');
  if (currentRangeElement) {
    const maxNum = Math.max(...allEpisodes.map(ep => parseInt(ep.number) || 0));
    currentRangeElement.textContent = `${start} - ${Math.min(end, maxNum)}`;
  }
}

// Manejar clic en el botón de rango de episodios
document.getElementById('episodeRangeBtn')?.addEventListener('click', function() {
  // Crear dropdown dinámico
  const existingDropdown = document.getElementById('episodeRangeDropdown');
  if (existingDropdown) {
    existingDropdown.remove();
    return;
  }

  const dropdown = document.createElement('div');
  dropdown.id = 'episodeRangeDropdown';
  dropdown.className = 'absolute bg-soft border border-line rounded-lg shadow-lg z-50';
  dropdown.style.minWidth = '120px';
  dropdown.style.bottom = '100%';
  dropdown.style.left = '0';
  dropdown.style.marginBottom = '8px';
  
  // Generar opciones de rango
  const ranges = [];
  const rangeSize = 50;
  const minEpisode = Math.min(...allEpisodes.map(ep => parseInt(ep.number) || 0));
  const maxEpisode = Math.max(...allEpisodes.map(ep => parseInt(ep.number) || 0));
  for (let i = minEpisode; i <= maxEpisode; i += rangeSize) {
    const end = Math.min(i + rangeSize - 1, maxEpisode);
    ranges.push({ start: i, end: end, label: `${i} - ${end}` });
  }

  ranges.forEach(range => {
    const option = document.createElement('button');
    option.className = 'w-full text-left px-3 py-2 text-sm text-text hover:bg-mute hover:text-lead transition-colors border-none bg-transparent';
    option.textContent = range.label;
    option.addEventListener('click', () => {
      currentRange = range;
      showEpisodesInRange(range.start, range.end);
      dropdown.remove();
    });
    dropdown.appendChild(option);
  });

  // Posicionar dropdown
  this.style.position = 'relative';
  this.appendChild(dropdown);

  // Cerrar dropdown al hacer clic fuera
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== document.getElementById('episodeRangeBtn')) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }, 0);
});

/* ---------- Toast para mostrar mensajes ---------- */
function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-4 right-4 z-50 hidden';
    toast.innerHTML = `
      <div class="bg-soft border border-line rounded-lg p-4 shadow-lg max-w-sm">
        <div class="flex items-center gap-3">
          <div class="shrink-0">
            <i class="fas fa-info-circle text-info" id="toast-icon"></i>
          </div>
          <div class="flex-1">
            <p class="text-sm text-text" id="toast-message">Mensaje</p>
          </div>
          <button class="shrink-0 text-subs hover:text-lead" id="toast-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);

    document.getElementById('toast-close').addEventListener('click', () => {
      toast.classList.add('hidden');
    });
  }

  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  if (toastIcon) {
    toastIcon.className = isError 
      ? 'fas fa-exclamation-circle text-fire' 
      : 'fas fa-check-circle text-wins';
  }

  if (toastMessage) {
    toastMessage.textContent = message;
  }

  toast.classList.remove('hidden');

  if (!message.includes('/')) {
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.classList.add('hidden');
  }
}

/* ---------- Descarga de episodios ---------- */
function getSelectedAudioType() {
  const selected = document.querySelector('input[name="audioType"]:checked');
  return selected ? selected.value : null;
}

function ensureDeviceModal() {
  let modal = document.getElementById('deviceSelectionModal');
  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'deviceSelectionModal';
  modal.className = 'fixed inset-0 z-50 hidden';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70"></div>
    <div class="relative z-10 flex min-h-full items-center justify-center p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-soft p-5 shadow-2xl">
        <h3 class="text-lg font-semibold text-lead">Seleccionar otro dispositivo</h3>
        <p class="mt-2 text-sm text-subs" id="deviceModalMessage">El dispositivo actual se desconecto.</p>
        <div class="mt-4 grid gap-2">
          <label class="text-sm text-subs" for="deviceModalSelect">Dispositivo disponible</label>
          <select id="deviceModalSelect" class="bg-mute border border-line rounded-lg px-3 py-2 text-sm text-lead focus:border-main focus:outline-none"></select>
        </div>
        <div class="mt-5 flex justify-end gap-3">
          <button type="button" id="deviceModalCancel" class="inline-flex items-center gap-2 px-4 py-2 bg-line text-subs hover:bg-edge hover:text-lead rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="button" id="deviceModalConfirm" class="inline-flex items-center gap-2 px-4 py-2 bg-main text-fore rounded-lg hover:opacity-90 transition-opacity">
            Usar dispositivo
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function requestDeviceSelection(devices, message) {
  return new Promise((resolve) => {
    const safeDevices = Array.isArray(devices) ? devices.filter(device => device && device.id) : [];
    if (safeDevices.length === 0) {
      resolve(null);
      return;
    }

    const modal = ensureDeviceModal();
    const messageNode = document.getElementById('deviceModalMessage');
    const select = document.getElementById('deviceModalSelect');
    const cancelBtn = document.getElementById('deviceModalCancel');
    const confirmBtn = document.getElementById('deviceModalConfirm');

    if (!select || !cancelBtn || !confirmBtn) {
      resolve(null);
      return;
    }

    select.innerHTML = '';
    safeDevices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = `${device.name || device.id}${device.status ? ` - ${device.status}` : ''}`;
      select.appendChild(option);
    });

    if (messageNode) {
      messageNode.textContent = message || 'El dispositivo actual se desconecto. Selecciona otro para continuar.';
    }

    const finish = (value) => {
      modal.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      resolve(value);
    };

    const onCancel = () => finish(null);
    const onConfirm = () => finish(select.value || null);

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    modal.classList.remove('hidden');
  });
}

async function saveWebDeviceSelection(deviceId) {
  const response = await fetch('/api/settings/web/device', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'No se pudo seleccionar el dispositivo.');
  }

  return payload;
}

function parseSsePayloads(buffer) {
  const payloads = [];
  let cursor = buffer;
  let cutAt = cursor.indexOf('\n\n');

  while (cutAt !== -1) {
    const chunk = cursor.slice(0, cutAt);
    cursor = cursor.slice(cutAt + 2);
    cutAt = cursor.indexOf('\n\n');

    const dataLine = chunk
      .split('\n')
      .map(line => line.trim())
      .find(line => line.startsWith('data:'));

    if (!dataLine) continue;

    try {
      payloads.push(JSON.parse(dataLine.slice(5).trim()));
    } catch (error) {
      console.warn('Error parsing SSE data:', error);
    }
  }

  return { payloads, rest: cursor };
}

async function handleDeviceDisconnected(payload) {
  const devices = Array.isArray(payload.devices) ? payload.devices : [];

  if (!payload.requiresDeviceSelection || devices.length === 0) {
    showToast(payload.msg || 'El dispositivo se desconecto y no hay otro disponible.', true);
    return false;
  }

  const selectedDeviceId = await requestDeviceSelection(devices, payload.msg);
  if (!selectedDeviceId) {
    showToast('Descarga cancelada por falta de dispositivo.', true);
    return false;
  }

  try {
    showToast('Cambiando dispositivo...', false);
    const saveResult = await saveWebDeviceSelection(selectedDeviceId);
    showToast(saveResult.message || 'Dispositivo actualizado. Reintentando descarga...', false);
    return true;
  } catch (error) {
    console.error('Error selecting fallback device:', error);
    showToast(error.message || 'No se pudo guardar el nuevo dispositivo.', true);
    return false;
  }
}

async function startDownload(episodes, audioType, retryCount = 0) {
  const animeName = window.animeData?.title || 'Anime';
  let shouldRetry = false;

  try {
    showToast('Iniciando descarga...', false);

    const res = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeName, episodes, audioType })
    });

    if (!res.ok || !res.body) {
      throw new Error('Error en la respuesta del servidor');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      const parsed = parseSsePayloads(pending);
      pending = parsed.rest;

      for (const payload of parsed.payloads) {
        const isDeviceError = payload
          && payload.code === 'MYJD_DEVICE_OFFLINE'
          && payload.requiresDeviceSelection;

        if (isDeviceError) {
          const canRetry = retryCount < 2;
          if (!canRetry) {
            showToast('No se pudo recuperar la descarga: demasiados reintentos de dispositivo.', true);
            await reader.cancel();
            return;
          }

          const deviceUpdated = await handleDeviceDisconnected(payload);
          if (deviceUpdated) {
            shouldRetry = true;
            await reader.cancel();
          }
          break;
        }

        const message = payload && payload.msg ? payload.msg : 'Proceso de descarga en curso.';
        const isError = Boolean(payload && payload.error);
        showToast(message, isError);

        if (payload && payload.done) {
          setTimeout(hideToast, 2000);
        }
      }

      if (shouldRetry) break;
    }
  } catch (error) {
    console.error('Error en descarga:', error);
    showToast('Error al procesar la descarga', true);
    return;
  }

  if (shouldRetry) {
    await startDownload(episodes, audioType, retryCount + 1);
  }
}

/* Botón de descarga completa */
document.getElementById('downloadAllBtn')?.addEventListener('click', () => {
  if (window.animeData?.episodes) {
    const eps = window.animeData.episodes.map(e => ({ number: e.number, link: e.link }));
    const audioType = getSelectedAudioType();
    if (!audioType) {
      showToast('Selecciona SUB o DUB para descargar', true);
      return;
    }
    startDownload(eps, audioType);
  } else {
    showToast('No hay episodios disponibles para descargar', true);
  }
});

/* Descarga individual de episodios */
document.addEventListener('click', function (e) {
  if (e.target.closest('.download-episode-btn')) {
    e.preventDefault();
    const btn = e.target.closest('.download-episode-btn');
    const episodeLink = btn.dataset.link;
    const episodeTitle = btn.dataset.title;
    const animeName = window.animeData?.title || 'Anime';
    const audioType = getSelectedAudioType();

    if (!audioType) {
      showToast('Selecciona SUB o DUB para descargar', true);
      return;
    }

    const fullEpisodeTitle = `${animeName} - ${episodeTitle}`;

    const originalContent = btn.innerHTML;
    btn.style.pointerEvents = 'none';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const requestEpisodeDownload = async (retryCount = 0) => {
      try {
        const response = await fetch('/download-episode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeTitle: fullEpisodeTitle, episodeLink, audioType })
        });

        const data = await response.json().catch(() => ({}));
        if (data.success) {
          showToast(data.message || 'Descarga enviada.', false);
          return;
        }

        const isDeviceError = data.code === 'MYJD_DEVICE_OFFLINE' && data.requiresDeviceSelection;
        if (isDeviceError && retryCount < 2) {
          const deviceUpdated = await handleDeviceDisconnected(data);
          if (deviceUpdated) {
            await requestEpisodeDownload(retryCount + 1);
            return;
          }
        }

        showToast(data.message || 'Error al procesar la descarga', true);
      } catch (error) {
        console.error('Error:', error);
        showToast('Error al procesar la descarga', true);
      }
    };

    requestEpisodeDownload()
      .finally(() => {
        btn.style.pointerEvents = 'auto';
        btn.innerHTML = originalContent;
      });
  }
});

/* ---------- Selección múltiple de episodios ---------- */
function updateBulkActions() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  const bulkActions = document.getElementById('bulkActions');
  const selectedCount = document.getElementById('selectedCount');
  
  if (selectedCount) selectedCount.textContent = checkboxes.length;
  
  if (bulkActions) {
    if (checkboxes.length > 0) {
      bulkActions.classList.remove('hidden');
    } else {
      bulkActions.classList.add('hidden');
    }
  }
}

// Event listener para checkboxes
document.addEventListener('change', function(e) {
  if (e.target.type === 'checkbox') {
    updateBulkActions();
  }
});

// Botón descargar seleccionados
document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => {
  const checked = document.querySelectorAll('input[type="checkbox"]:checked');
  const eps = Array.from(checked).map(cb => ({
    number: cb.closest('[data-episode]').dataset.episode,
    link: cb.value
  }));
  if (eps.length === 0) {
    showToast('No hay episodios seleccionados', true);
    return;
  }
  const audioType = getSelectedAudioType();
  if (!audioType) {
    showToast('Selecciona SUB o DUB para descargar', true);
    return;
  }
  startDownload(eps, audioType);
});

// Botón limpiar selección
document.getElementById('clearSelectionBtn')?.addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateBulkActions();
});

// Funcionalidad de búsqueda
document.getElementById('searchBtn')?.addEventListener('click', () => {
  const searchInput = document.getElementById('episodeSearch');
  if (searchInput.classList.contains('hidden')) {
    searchInput.classList.remove('hidden');
    searchInput.focus();
  } else {
    searchInput.classList.add('hidden');
    searchInput.value = '';
    // Mostrar todos los episodios
    const episodes = document.querySelectorAll('[data-episode]');
    episodes.forEach(ep => ep.style.display = 'block');
  }
});

document.getElementById('episodeSearch')?.addEventListener('input', function() {
  const query = this.value.toLowerCase();
  const episodes = document.querySelectorAll('[data-episode]');
  
  episodes.forEach(episode => {
    const episodeNumber = episode.dataset.episode;
    const episodeTitle = `episodio ${episodeNumber}`;
    
    if (episodeNumber.includes(query) || episodeTitle.includes(query)) {
      episode.style.display = 'block';
    } else {
      episode.style.display = 'none';
    }
  });
});

// Inicializar la vista con los primeros 50 episodios
document.addEventListener('DOMContentLoaded', function() {
  if (allEpisodes.length > 0) {
    const minEpisode = Math.min(...allEpisodes.map(ep => parseInt(ep.number) || 0));
    const maxEpisode = Math.max(...allEpisodes.map(ep => parseInt(ep.number) || 0));
    const start = minEpisode === 0 ? 0 : 1;
    showEpisodesInRange(start, Math.min(start + 49, maxEpisode));
  }
});
