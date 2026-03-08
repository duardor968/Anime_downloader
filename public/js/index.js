// public/js/index.js
document.addEventListener('DOMContentLoaded', function () {
  // Sistema de reintento para imágenes
  document.querySelectorAll('img').forEach(img => {
    let retries = 0;
    const maxRetries = 3;

    img.addEventListener('error', function () {
      if (retries < maxRetries) {
        retries++;
        setTimeout(() => {
          this.src = this.src + (this.src.includes('?') ? '&' : '?') + 't=' + Date.now();
        }, 1000 * retries);
      }
    });
  });

  // Mobile search modal
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchModal = document.getElementById('mobile-search-modal');
  const closeMobileSearch = document.getElementById('close-mobile-search');

  function openMobileSearch() {
    if (mobileSearchModal) {
      mobileSearchModal.classList.remove('hidden');
      const input = document.getElementById('mobile-search-input');
      if (input) input.focus();
    }
  }

  function closeMobileSearchModal() {
    if (mobileSearchModal) {
      mobileSearchModal.classList.add('hidden');
    }
  }

  if (mobileSearchBtn) mobileSearchBtn.addEventListener('click', openMobileSearch);
  if (closeMobileSearch) closeMobileSearch.addEventListener('click', closeMobileSearchModal);

  // Close modal on backdrop click
  if (mobileSearchModal) {
    mobileSearchModal.addEventListener('click', function (e) {
      if (e.target === mobileSearchModal) {
        closeMobileSearchModal();
      }
    });
  }

  // Desktop search
  const searchInput = document.getElementById('search-input');
  const searchIcon = document.getElementById('search-icon');

  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        const form = this.closest('form');
        if (form && this.value.trim()) form.submit();
      }
    });
  }

  if (searchIcon) {
    searchIcon.addEventListener('click', function () {
      if (searchInput && searchInput.value.trim()) {
        const form = searchInput.closest('form');
        if (form) form.submit();
      }
    });
  }

  function initFeaturedCarousel() {
    const carouselRoot = document.querySelector('[data-carousel-root]');
    const carouselViewport = carouselRoot?.querySelector('[data-carousel-viewport]');
    const carouselSlides = document.getElementById('carousel-slides');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicators = Array.from(document.querySelectorAll('.carousel-indicator'));
    const currentSlideEl = document.getElementById('current-slide');
    const progressBar = document.getElementById('progress-bar');
    const emblaFactory = window.EmblaCarousel;

    if (!carouselRoot || !carouselViewport || !carouselSlides || typeof emblaFactory !== 'function') {
      return;
    }

    const slides = Array.from(carouselSlides.children);

    if (slides.length <= 1) {
      return;
    }

    const autoplayDelay = 6000;

    const embla = emblaFactory(carouselViewport, {
      align: 'start',
      loop: true,
      duration: 28
    });

    let progressAnimationFrame = 0;
    let cycleStart = null;

    function updateSelectedState() {
      const selectedIndex = embla.selectedScrollSnap();

      indicators.forEach((indicator, index) => {
        const isActive = index === selectedIndex;
        indicator.classList.toggle('bg-white', isActive);
        indicator.classList.toggle('bg-white/30', !isActive);
      });

      if (currentSlideEl) {
        currentSlideEl.textContent = String(selectedIndex + 1);
      }
    }

    function syncProgress() {
      progressAnimationFrame = window.requestAnimationFrame(syncProgress);

      if (cycleStart === null) {
        cycleStart = performance.now();
      }

      const elapsed = performance.now() - cycleStart;
      const progress = Math.max(0, Math.min(1, elapsed / autoplayDelay));

      if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
      }

      if (elapsed >= autoplayDelay) {
        cycleStart = performance.now();
        embla.scrollNext();
        if (progressBar) {
          progressBar.style.width = '0%';
        }
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        embla.scrollPrev();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        embla.scrollNext();
      });
    }

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        embla.scrollTo(index);
      });
    });

    carouselRoot.addEventListener('keydown', (event) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if (isEditable) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        embla.scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        embla.scrollNext();
      }
    });

    embla.on('select', updateSelectedState);
    embla.on('reInit', updateSelectedState);
    embla.on('pointerDown', () => {
      carouselViewport.classList.remove('cursor-grab');
      carouselViewport.classList.add('cursor-grabbing');
    });
    embla.on('pointerUp', () => {
      carouselViewport.classList.remove('cursor-grabbing');
      carouselViewport.classList.add('cursor-grab');
    });

    updateSelectedState();
    if (progressBar) {
      progressBar.style.width = '0%';
    }

    progressAnimationFrame = window.requestAnimationFrame(syncProgress);
    window.addEventListener('beforeunload', () => {
      window.cancelAnimationFrame(progressAnimationFrame);
    }, { once: true });
  }

  initFeaturedCarousel();

  // Toast notification function
  function showToast(message, isError = false) {
    let toast = document.getElementById('main-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'main-toast';
      toast.className = 'fixed bottom-4 right-4 z-50 hidden';
      toast.innerHTML = `
        <div class="bg-soft border border-line rounded-lg p-4 shadow-lg max-w-sm">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <i class="fas fa-info-circle text-info" id="main-toast-icon"></i>
            </div>
            <div class="flex-1">
              <p class="text-sm text-text" id="main-toast-message">Mensaje</p>
            </div>
            <button class="flex-shrink-0 text-subs hover:text-lead" id="main-toast-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(toast);

      document.getElementById('main-toast-close').addEventListener('click', () => {
        toast.classList.add('hidden');
      });
    }

    const toastIcon = document.getElementById('main-toast-icon');
    const toastMessage = document.getElementById('main-toast-message');

    if (isError) {
      toastIcon.className = 'fas fa-exclamation-circle text-red-500';
    } else {
      toastIcon.className = 'fas fa-check-circle text-green-500';
    }

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  function ensureDeviceModal() {
    let modal = document.getElementById('main-device-selection-modal');
    if (modal) {
      return modal;
    }

    modal = document.createElement('div');
    modal.id = 'main-device-selection-modal';
    modal.className = 'fixed inset-0 z-50 hidden';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/70"></div>
      <div class="relative z-10 flex min-h-full items-center justify-center p-4">
        <div class="w-full max-w-md rounded-xl border border-line bg-soft p-5 shadow-2xl">
          <h3 class="text-lg font-semibold text-lead">Seleccionar otro dispositivo</h3>
          <p class="mt-2 text-sm text-subs" id="main-device-modal-message">El dispositivo actual se desconecto.</p>
          <div class="mt-4 grid gap-2">
            <label class="text-sm text-subs" for="main-device-modal-select">Dispositivo disponible</label>
            <select id="main-device-modal-select" class="bg-mute border border-line rounded-lg px-3 py-2 text-sm text-lead focus:border-main focus:outline-none"></select>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button type="button" id="main-device-modal-cancel" class="inline-flex items-center gap-2 px-4 py-2 bg-line text-subs hover:bg-edge hover:text-lead rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="button" id="main-device-modal-confirm" class="inline-flex items-center gap-2 px-4 py-2 bg-main text-fore rounded-lg hover:opacity-90 transition-opacity">
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
      const messageNode = document.getElementById('main-device-modal-message');
      const select = document.getElementById('main-device-modal-select');
      const cancelBtn = document.getElementById('main-device-modal-cancel');
      const confirmBtn = document.getElementById('main-device-modal-confirm');

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

  async function selectFallbackDevice(deviceId) {
    const response = await fetch('/api/settings/web/device', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'No se pudo actualizar el dispositivo.');
    }

    return payload;
  }

  async function resolveDeviceDisconnection(data) {
    const devices = Array.isArray(data.devices) ? data.devices : [];
    if (!data.requiresDeviceSelection || devices.length === 0) {
      showToast(data.message || 'No hay otros dispositivos disponibles.', true);
      return false;
    }

    const selectedDeviceId = await requestDeviceSelection(devices, data.message);
    if (!selectedDeviceId) {
      showToast('Descarga cancelada por falta de dispositivo.', true);
      return false;
    }

    try {
      showToast('Cambiando dispositivo...', false);
      const saved = await selectFallbackDevice(selectedDeviceId);
      showToast(saved.message || 'Dispositivo actualizado. Reintentando...', false);
      return true;
    } catch (error) {
      console.error('Error selecting fallback device:', error);
      showToast(error.message || 'No se pudo actualizar el dispositivo.', true);
      return false;
    }
  }

  // Handle episode downloads
  document.addEventListener('click', function (e) {
    if (e.target.closest('.download-episode-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const btn = e.target.closest('.download-episode-btn');
      const episodeTitle = btn.dataset.title;
      const episodeLink = btn.dataset.link;

      const originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xl"></i>';

      const requestDownload = async (retryCount = 0) => {
        try {
          const response = await fetch('/download-episode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              episodeTitle,
              episodeLink
            })
          });

          const data = await response.json().catch(() => ({}));
          if (data.success) {
            showToast(data.message || 'Descarga enviada.', false);
            return;
          }

          const isDeviceError = data.code === 'MYJD_DEVICE_OFFLINE' && data.requiresDeviceSelection;
          if (isDeviceError && retryCount < 2) {
            const deviceChanged = await resolveDeviceDisconnection(data);
            if (deviceChanged) {
              await requestDownload(retryCount + 1);
              return;
            }
          }

          showToast(data.message || 'Error al procesar la descarga', true);
        } catch (error) {
          console.error('Error:', error);
          showToast('Error al procesar la descarga', true);
        }
      };

      requestDownload()
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalContent;
        });
    }
  });
});
