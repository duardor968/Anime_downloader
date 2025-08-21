// public/scripts.js
document.addEventListener('DOMContentLoaded', function() {
  // Hero Carousel
  const carousel = {
    currentSlide: 0,
    slides: document.querySelectorAll('.carousel-slide'),
    indicators: document.querySelectorAll('.carousel-indicator'),
    
    init() {
      if (this.slides.length === 0) return;
      
      // Auto-play
      setInterval(() => this.nextSlide(), 5000);
      
      // Controls
      document.getElementById('carousel-prev')?.addEventListener('click', () => this.prevSlide());
      document.getElementById('carousel-next')?.addEventListener('click', () => this.nextSlide());
      
      // Indicators
      this.indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => this.goToSlide(index));
      });
    },
    
    goToSlide(index) {
      this.slides[this.currentSlide]?.classList.remove('active');
      this.indicators[this.currentSlide]?.classList.remove('active');
      
      this.currentSlide = index;
      
      this.slides[this.currentSlide]?.classList.add('active');
      this.indicators[this.currentSlide]?.classList.add('active');
    },
    
    nextSlide() {
      const next = (this.currentSlide + 1) % this.slides.length;
      this.goToSlide(next);
    },
    
    prevSlide() {
      const prev = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
      this.goToSlide(prev);
    }
  };
  
  carousel.init();
  
  // Toast para mostrar mensajes
  function showToast(message, isError = false) {
    // Crear toast si no existe
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
      
      // Agregar evento de cierre
      document.getElementById('main-toast-close').addEventListener('click', () => {
        toast.classList.add('hidden');
      });
    }
    
    const toastIcon = document.getElementById('main-toast-icon');
    const toastMessage = document.getElementById('main-toast-message');
    
    // Configurar icono y mensaje
    if (isError) {
      toastIcon.className = 'fas fa-exclamation-circle text-fire';
    } else {
      toastIcon.className = 'fas fa-check-circle text-wins';
    }
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  // Manejar descargas de episodios individuales
  document.addEventListener('click', function(e) {
    if (e.target.closest('.download-episode-btn')) {
      const btn = e.target.closest('.download-episode-btn');
      const episodeTitle = btn.dataset.title;
      const episodeLink = btn.dataset.link;
      
      // Deshabilitar botón temporalmente
      const originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Descargando...';
      
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
        // Restaurar botón
        btn.disabled = false;
        btn.innerHTML = originalContent;
      });
    }
  });
  // Carousel functionality
  const carousel = {
    currentSlide: 0,
    slides: document.querySelectorAll('#carousel-slides > article'),
    container: document.getElementById('carousel-slides'),
    
    init() {
      if (this.slides.length === 0) return;
      
      // Auto-play
      this.autoPlay = setInterval(() => this.nextSlide(), 5000);
      
      // Controls
      const prevBtn = document.getElementById('carousel-prev');
      const nextBtn = document.getElementById('carousel-next');
      
      if (prevBtn) prevBtn.addEventListener('click', () => this.prevSlide());
      if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());
      
      // Pause on hover
      if (this.container) {
        this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.container.addEventListener('mouseleave', () => this.resumeAutoPlay());
      }
    },
    
    goToSlide(index) {
      this.currentSlide = index;
      if (this.container) {
        this.container.style.transform = `translateX(-${index * 100}%)`;
      }
    },
    
    nextSlide() {
      const next = (this.currentSlide + 1) % this.slides.length;
      this.goToSlide(next);
    },
    
    prevSlide() {
      const prev = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
      this.goToSlide(prev);
    },
    
    pauseAutoPlay() {
      if (this.autoPlay) {
        clearInterval(this.autoPlay);
      }
    },
    
    resumeAutoPlay() {
      this.autoPlay = setInterval(() => this.nextSlide(), 5000);
    }
  };
  
  carousel.init();
  
  // Manejar búsqueda
  const searchForm = document.querySelector('form[action="/search"]');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      const searchInput = this.querySelector('input[name="q"]');
      if (!searchInput.value.trim()) {
        e.preventDefault();
        showToast('Por favor ingresa un término de búsqueda', true);
      }
    });
  }
  
  // Manejar descargas
  document.getElementById('download-all').addEventListener('click', function() {
    const animeName = document.querySelector('.anime-details h2').textContent;
    const episodes = document.querySelectorAll('.episode-item input');
    
    const selectedEpisodes = [];
    episodes.forEach(episode => {
      selectedEpisodes.push({
        number: episode.id.split('-')[1],
        link: episode.value
      });
    });
    
    performDownload(animeName, selectedEpisodes);
  });
  
  document.getElementById('download-selected').addEventListener('click', function() {
    const animeName = document.querySelector('.anime-details h2').textContent;
    const selectedEpisodes = [];
    
    document.querySelectorAll('.episode-item input:checked').forEach(episode => {
      selectedEpisodes.push({
        number: episode.id.split('-')[1],
        link: episode.value
      });
    });
    
    performDownload(animeName, selectedEpisodes);
  });
  
  // Función para realizar la descarga
  async function performDownload(animeName, episodes) {
    try {
      showToast('Iniciando descarga...', false);
      
      const response = await fetch('/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ animeName, episodes })
      });
      
      const result = await response.json();
      if (result.success) {
        showToast('Enlaces agregados correctamente a JDownloader', false);
      } else {
        showToast('Error al agregar enlaces a JDownloader', true);
      }
    } catch (error) {
      console.error('Error al realizar la descarga:', error);
      showToast('Error al procesar la solicitud', true);
    }
  }
  
  // Lazy loading para imágenes
  const images = document.querySelectorAll('img[loading="lazy"]');
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.src; // Trigger load
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
});