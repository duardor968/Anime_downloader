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
    currentRangeElement.textContent = `${start} - ${Math.min(end, allEpisodes.length)}`;
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
  for (let i = 1; i <= allEpisodes.length; i += rangeSize) {
    const end = Math.min(i + rangeSize - 1, allEpisodes.length);
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

async function startDownload(episodes, audioType) {
  const animeName = window.animeData?.title || 'Anime';

  try {
    showToast('Iniciando descarga...', false);

    const res = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeName, episodes, audioType })
    });

    if (!res.ok) {
      throw new Error('Error en la respuesta del servidor');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const { msg, done: finished } = JSON.parse(line.slice(5).trim());
            showToast(msg, false);
            if (finished) {
              setTimeout(hideToast, 2000);
            }
          } catch (e) {
            console.warn('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en descarga:', error);
    showToast('Error al procesar la descarga', true);
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

    fetch('/download-episode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeTitle: fullEpisodeTitle, episodeLink, audioType })
    })
      .then(response => response.json())
      .then(data => {
        showToast(data.message, !data.success);
      })
      .catch(error => {
        console.error('Error:', error);
        showToast('Error al procesar la descarga', true);
      })
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
    showEpisodesInRange(1, Math.min(50, allEpisodes.length));
  }
});
