/* ---------- Episode re-ordering ---------- */
const sortSelect = document.getElementById('episodeSort');
const container = document.getElementById('episodesContainer');

sortSelect?.addEventListener('change', () => {
  const order = sortSelect.value;              // "asc" | "desc"
  const cards = Array.from(container.children); // all episode nodes

  cards.sort((a, b) => {
    const numA = parseInt(a.dataset.episode, 10);
    const numB = parseInt(b.dataset.episode, 10);
    return order === 'asc' ? numA - numB : numB - numA;
  });

  // Re-append in new order
  cards.forEach(card => container.appendChild(card));
});

/* ---------- Seleccionar / Deseleccionar Todo ---------- */
const selectAllBtn = document.getElementById('selectAllBtn');
const checkboxes = () => document.querySelectorAll('[data-episode] input[type="checkbox"]');
const bulkActions = document.getElementById('bulkActions');
const selectedCount = document.getElementById('selectedCount');

let allSelected = false; // estado interno

// Inicializar estado de la barra de acciones
refreshBulkBar();

selectAllBtn?.addEventListener('click', () => {
  allSelected = !allSelected;            // invertimos el estado
  checkboxes().forEach(cb => cb.checked = allSelected);

  // Actualizar texto del botón
  selectAllBtn.innerHTML = allSelected
    ? '<i class="fas fa-times-square mr-2"></i><span>Deseleccionar Todo</span>'
    : '<i class="fas fa-check-square mr-2"></i><span>Seleccionar Todo</span>';

  refreshBulkBar();
});

/* ---------- Función auxiliar para mostrar / ocultar barra masiva ---------- */
function refreshBulkBar() {
  const checked = [...checkboxes()].filter(cb => cb.checked);
  if (selectedCount) selectedCount.textContent = checked.length;

  // Mostrar u ocultar la barra
  if (bulkActions) {
    if (checked.length > 0) {
      bulkActions.classList.remove('hidden');
    } else {
      bulkActions.classList.add('hidden');
    }
  }
}

/* ---------- Actualizar barra cada vez que un checkbox cambie ---------- */
container?.addEventListener('change', e => {
  if (e.target.matches('input[type="checkbox"]')) {
    refreshBulkBar();

    // Actualizar estado del botón "Seleccionar Todo"
    const totalCheckboxes = checkboxes().length;
    const checkedCheckboxes = [...checkboxes()].filter(cb => cb.checked).length;

    if (selectAllBtn) {
      if (checkedCheckboxes === totalCheckboxes && totalCheckboxes > 0) {
        allSelected = true;
        selectAllBtn.innerHTML = '<i class="fas fa-times-square mr-2"></i><span>Deseleccionar Todo</span>';
      } else {
        allSelected = false;
        selectAllBtn.innerHTML = '<i class="fas fa-check-square mr-2"></i><span>Seleccionar Todo</span>';
      }
    }
  }
});

/* ---------- Búsqueda de episodios ---------- */
const episodeSearch = document.getElementById('episodeSearch');
episodeSearch?.addEventListener('input', function () {
  const query = this.value.toLowerCase();
  const episodes = document.querySelectorAll('[data-episode]');

  episodes.forEach(episode => {
    const title = episode.querySelector('h3')?.textContent.toLowerCase() || '';
    const number = episode.dataset.episode || '';

    if (title.includes(query) || number.includes(query)) {
      episode.style.display = 'block';
    } else {
      episode.style.display = 'none';
    }
  });
});

/* ---------- Selector de rango de episodios ---------- */
const episodeRange = document.getElementById('episodeRange');
episodeRange?.addEventListener('change', function () {
  const [start, end] = this.value.split('-').map(Number);
  const episodes = document.querySelectorAll('[data-episode]');

  episodes.forEach(episode => {
    const number = parseInt(episode.dataset.episode);

    if (number >= start && number <= end) {
      episode.style.display = 'block';
    } else {
      episode.style.display = 'none';
    }
  });
});

/* ---------- Botón "Limpiar Selección" ---------- */
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

clearSelectionBtn?.addEventListener('click', () => {
  // Desmarcar todos los checkboxes
  document
    .querySelectorAll('[data-episode] input[type="checkbox"]')
    .forEach(cb => cb.checked = false);

  // Restaurar estado y texto del botón principal
  allSelected = false;
  if (selectAllBtn) {
    selectAllBtn.innerHTML = '<i class="fas fa-check-square mr-2"></i><span>Seleccionar Todo</span>';
  }

  // Ocultar la barra de acciones masivas
  refreshBulkBar();
});

/* ---------- Toast para mostrar mensajes ---------- */
function showToast(message, isError = false) {
  // Usar el toast existente o crear uno nuevo
  let toast = document.getElementById('toast');
  if (!toast) {
    // Crear toast si no existe
    toast = document.createElement('div');
    toast.id = 'anime-toast';
    toast.className = 'fixed bottom-4 left-4 z-50 hidden';
    toast.innerHTML = `
      <div class="bg-soft border border-line rounded-lg p-4 shadow-lg max-w-sm">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-info" id="anime-toast-icon"></i>
          </div>
          <div class="flex-1">
            <p class="text-sm text-text" id="anime-toast-message">Mensaje</p>
          </div>
          <button class="flex-shrink-0 text-subs hover:text-lead" id="anime-toast-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);

    // Agregar evento de cierre
    document.getElementById('anime-toast-close').addEventListener('click', () => {
      toast.classList.add('hidden');
    });
  }

  const toastIcon = document.getElementById('anime-toast-icon') || toast.querySelector('i');
  const toastMessage = document.getElementById('anime-toast-message') || toast.querySelector('p');
  const isVisible = !toast.classList.contains('hidden');

  // Solo actualizar contenido si ya está visible (evita parpadeo)
  if (isVisible) {
    if (toastMessage) {
      toastMessage.textContent = message;
    }
    return; // No hacer nada más
  }

  // Configurar icono y mensaje solo para toast nuevo
  if (toastIcon) {
    if (isError) {
      toastIcon.className = 'fas fa-exclamation-circle text-fire';
    } else {
      toastIcon.className = 'fas fa-check-circle text-wins';
    }
  }

  if (toastMessage) {
    toastMessage.textContent = message;
  }

  toast.classList.remove('hidden');

  // Auto-ocultar después de 3 segundos solo si no es un mensaje de progreso
  if (!message.includes('/')) {
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

function hideToast() {
  const toast = document.getElementById('toast') || document.getElementById('anime-toast');
  if (toast) {
    toast.classList.add('hidden');
  }
}

async function startDownload(episodes) {
  const animeName = window.animeData?.title || 'Anime';

  try {
    showToast('Iniciando descarga...', false);

    const res = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeName, episodes })
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

/* Botones de descarga */
document.getElementById('downloadAllBtn')?.addEventListener('click', () => {
  if (window.animeData?.episodes) {
    const eps = window.animeData.episodes.map(e => ({ number: e.number, link: e.link }));
    startDownload(eps);
  } else {
    showToast('No hay episodios disponibles para descargar', true);
  }
});

document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => {
  const checked = [...document.querySelectorAll('[data-episode] input[type="checkbox"]:checked')];
  const eps = checked.map(cb => {
    const card = cb.closest('[data-episode]');
    return { number: card.dataset.episode, link: cb.value };
  });
  if (!eps.length) return showToast('Nada seleccionado', true);
  startDownload(eps);
});

/* Descarga individual de episodios */
document.addEventListener('click', function (e) {
  if (e.target.closest('.download-episode')) {
    const btn = e.target.closest('.download-episode');
    const episodeLink = btn.dataset.link;
    const episodeTitle = btn.dataset.title;
    const animeName = window.animeData?.title || 'Anime';

    // Crear título completo con nombre del anime
    const fullEpisodeTitle = `${animeName} - ${episodeTitle}`;

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Descargando...</span>';

    fetch('/download-episode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeTitle: fullEpisodeTitle, episodeLink })
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
        btn.disabled = false;
        btn.innerHTML = originalContent;
      });
  }
});