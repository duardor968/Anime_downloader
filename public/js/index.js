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

  // Carousel functionality (reworked)
  const carouselSlides = document.getElementById('carousel-slides');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const indicators = document.querySelectorAll('.carousel-indicator');
  const currentSlideEl = document.getElementById('current-slide');
  const progressBar = document.getElementById('progress-bar');

  if (carouselSlides && prevBtn && nextBtn) {
    const slides = carouselSlides.children;
    const totalSlides = slides.length;
    const duration = 6000;
    let currentSlide = 0;
    let progressMs = 0;
    let rafId = null;
    let lastTime = null;
    let paused = false;

    function updateIndicators() {
      indicators.forEach((indicator, index) => {
        if (index === currentSlide) {
          indicator.classList.add('bg-white');
          indicator.classList.remove('bg-white/30');
        } else {
          indicator.classList.remove('bg-white');
          indicator.classList.add('bg-white/30');
        }
      });
      if (currentSlideEl) {
        currentSlideEl.textContent = currentSlide + 1;
      }
    }

    function applyTransform() {
      carouselSlides.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    function setProgress(value) {
      progressMs = Math.max(0, Math.min(value, duration));
      if (progressBar) {
        progressBar.style.width = `${(progressMs / duration) * 100}%`;
      }
    }

    function goToSlide(index) {
      currentSlide = (index + totalSlides) % totalSlides;
      applyTransform();
      updateIndicators();
      setProgress(0);
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function prevSlide() {
      goToSlide(currentSlide - 1);
    }

    function tick(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      if (!paused && totalSlides > 1) {
        setProgress(progressMs + delta);
        if (progressMs >= duration) {
          nextSlide();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    function startAutoPlay() {
      if (rafId) cancelAnimationFrame(rafId);
      lastTime = null;
      paused = false;
      rafId = requestAnimationFrame(tick);
    }

    function pauseAutoPlay() {
      paused = true;
    }

    function resumeAutoPlay() {
      paused = false;
      lastTime = null;
    }

    prevBtn.addEventListener('click', () => {
      prevSlide();
      resumeAutoPlay();
    });

    nextBtn.addEventListener('click', () => {
      nextSlide();
      resumeAutoPlay();
    });

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        goToSlide(index);
        resumeAutoPlay();
      });
    });

    carouselSlides.addEventListener('mouseenter', pauseAutoPlay);
    carouselSlides.addEventListener('mouseleave', resumeAutoPlay);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseAutoPlay();
      } else {
        resumeAutoPlay();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
        resumeAutoPlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
        resumeAutoPlay();
      }
    });

    updateIndicators();
    setProgress(0);
    startAutoPlay();
  }

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

      fetch('/download-episode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          episodeTitle,
          episodeLink
        })
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
});
