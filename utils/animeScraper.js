// utils/animeScraper.js
const cheerio = require('cheerio');
const { makeRequest } = require('./hybridRequest');

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'hace menos de 1 hora';
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  return `hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
}

async function getRecentAnimes() {
  try {
    console.log('Realizando solicitud a animeav1.com...');
    const response = await makeRequest('https://animeav1.com');
    console.log('Solicitud realizada con éxito. Verificando contenido...');
    
    if (!response.data) {
      console.error('No se obtuvo contenido de la página');
      return { recentEpisodes: [], recentAnimes: [], featuredAnimes: [] };
    }

    const $ = cheerio.load(response.data);

    // Extraer animes destacados del carrusel
    console.log('Extrayendo animes destacados...');
    const featuredAnimes = [];
    $('.flex.transform-gpu article').each((index, element) => {
      if (index >= 10) return false; // Obtener hasta 10 elementos
      const $element = $(element);
      
      const title = $element.find('h1').text().trim();
      const description = $element.find('.entry p').text().trim();
      const backdrop = $element.find('img').attr('src');
      const link = $element.find('a[href*="/media/"]').attr('href');
      
      // Extraer metadatos
      const metaText = $element.find('.flex.flex-wrap.items-center.gap-2.text-sm').text();
      const type = metaText.match(/(TV Anime|Movie|OVA)/)?.[1] || 'TV Anime';
      const year = metaText.match(/(\d{4})/)?.[1] || new Date().getFullYear();
      const status = metaText.includes('En emisión') ? 'En emisión' : 'Finalizado';
      
      // Extraer géneros
      const genres = [];
      $element.find('a[href*="/catalogo?genre="]').each((i, genreEl) => {
        genres.push($(genreEl).text().trim());
      });
      
      if (title && backdrop && link) {
        const slug = link.replace('/media/', '');
        featuredAnimes.push({
          title,
          slug,
          description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
          backdrop: backdrop.startsWith('http') ? backdrop : `https://animeav1.com${backdrop}`,
          link: link.startsWith('http') ? link : `https://animeav1.com${link}`,
          type,
          year,
          status,
          genres: genres.slice(0, 4)
        });
      }
    });

    console.log('Extrayendo episodios recientes...');
    const recentEpisodes = [];
    $('main section:first-child article').each((index, element) => {
      const $element = $(element);
      
      const link = $element.find('a').attr('href');
      const poster = $element.find('img').attr('src');
      const animeTitle = $element.find('header .text-subs').text().trim();
      const episodeNumber = $element.find('.bg-line span.text-lead').text().trim();
      const timeElement = $element.find('span.text-xs.font-bold.text-subs').first();
      const timeText = timeElement.length ? timeElement.text().trim() : $element.find('.text-xs.font-bold.text-subs').first().text().trim().split('Episodio')[0].trim();
      
      if (animeTitle && poster && link) {
        const title = animeTitle;
        recentEpisodes.push({ 
          title, 
          poster: poster.startsWith('http') ? poster : `https://animeav1.com${poster}`,
          link: link.startsWith('http') ? link : `https://animeav1.com${link}`,
          timeAgo: timeText || getTimeAgo(new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)),
          episodeNumber
        });
      }
    });

    console.log('Extrayendo animes recientes...');
    const recentAnimes = [];
    $('main section:nth-child(2) article').each((index, element) => {
      const $element = $(element);
      const title = $element.find('h3').text().trim();
      const poster = $element.find('img').attr('src');
      const link = $element.find('a').attr('href');
      const type = $element.find('.text-xs.font-bold.text-subs').text().trim() || 'TV Anime';

      if (title && poster && link) {
        const slug = link.replace('/media/', '');
        recentAnimes.push({ 
          title,
          slug,
          poster: poster.startsWith('http') ? poster : `https://animeav1.com${poster}`,
          link: link.startsWith('http') ? link : `https://animeav1.com${link}`,
          type
        });
      }
    });

    console.log('Proceso de extracción completado.');
    return { recentEpisodes, recentAnimes, featuredAnimes };
  } catch (error) {
    console.error('Error al obtener animes:', error);
    return { recentEpisodes: [], recentAnimes: [], featuredAnimes: [] };
  }
}

async function searchAnimes(query) {
  try {
    console.log(`Iniciando búsqueda para: ${query}`);
    const encodedQuery = encodeURIComponent(query);
    const url = `https://animeav1.com/catalogo?search=${encodedQuery}`;
    console.log(`URL de búsqueda: ${url}`);
    
    const response = await makeRequest(url);
    console.log('Respuesta recibida, procesando HTML...');
    
    const $ = cheerio.load(response.data);
    const animes = [];
    
    // Buscar en la estructura: main > section > article
    $('main section article.group\\/item').each((index, element) => {
      const $element = $(element);
      
      // Extraer título del h3 dentro del header
      const title = $element.find('header h3').text().trim();
      
      // Extraer imagen (primer img encontrado)
      const poster = $element.find('img').first().attr('src');
      
      // Extraer enlace del elemento <a> que contiene el href
      const linkElement = $element.find('a[href^="/media/"]');
      const link = linkElement.attr('href');
      
      // Extraer slug del enlace
      let slug = '';
      if (link) {
        slug = link.replace('/media/', '');
      }
      
      // Extraer tipo de anime (TV Anime, Movie, etc.)
      const animeType = $element.find('.text-xs.font-bold.text-subs').text().trim();
      
      // Extraer descripción si está disponible
      const description = $element.find('.line-clamp-6').text().trim();
      
      console.log(`Anime encontrado: ${title}, Poster: ${poster}, Link: ${link}, Slug: ${slug}`);
      
      if (title && poster && link) {
        animes.push({ 
          title, 
          slug, 
          poster: poster.startsWith('http') ? poster : `https://animeav1.com${poster}`,
          link: link.startsWith('http') ? link : `https://animeav1.com${link}`,
          type: animeType || 'Anime',
          description: description || ''
        });
      }
    });
    
    console.log(`Búsqueda completada. ${animes.length} animes encontrados.`);
    return animes;
  } catch (error) {
    console.error('Error al buscar animes:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return [];
  }
}

async function getAnimeDetails(slug) {
  try {
    console.log(`Obteniendo detalles del anime: ${slug}`);
    const url = `https://animeav1.com/media/${slug}`;
    console.log(`URL del anime: ${url}`);
    
    const response = await makeRequest(url);
    console.log('Respuesta recibida, procesando detalles del anime...');
    
    const $ = cheerio.load(response.data);
    
    // Buscar el article principal que contiene la información del anime
    const mainArticle = $('article.text-subs.dark.relative').first();
    
    if (!mainArticle.length) {
      console.error('No se encontró el article principal del anime');
      return null;
    }
    
    // Extraer información básica del anime
    let title = mainArticle.find('h1.text-lead').first().text().trim() || $('h1').first().text().trim();
    
    // Limpiar el título de información extra
    title = title.replace(/\d+\.\d+.*$/, '').trim(); // Remover rating y texto después
    title = title.replace(/Episodio\s*\d+.*$/, '').trim(); // Remover episodios
    title = title.replace(/\d+\s*Episodios?.*$/, '').trim(); // Remover conteo de episodios
    
    const alternativeTitle = mainArticle.find('h2.text-main').text().trim() || $('h2').first().text().trim();
    
    // Extraer poster (imagen de portada)
    const poster = mainArticle.find('figure img[alt*="Poster"]').attr('src') || 
                   mainArticle.find('figure img.aspect-poster').attr('src') ||
                   $('img[alt*="Poster"]').attr('src');
    
    // Extraer backdrop (imagen de fondo)
    const backdrop = mainArticle.find('img[alt*="Backdrop"]').attr('src') ||
                     $('img[alt*="Backdrop"]').attr('src');
    
    // Extraer descripción
    const description = mainArticle.find('.entry p').text().trim() || $('.entry p').text().trim();
    
    // Extraer metadatos de forma más específica
    const metaInfo = [];
    $('.flex.flex-wrap.items-center.gap-2.text-sm').find('span').each((index, element) => {
      const text = $(element).text().trim();
      if (text && text !== '•' && text.length > 0 && !text.includes('Episodio')) {
        metaInfo.push(text);
      }
    });
    
    const type = metaInfo.find(info => info.includes('Anime') || info.includes('Movie') || info.includes('OVA')) || 'TV Anime';
    const year = metaInfo.find(info => /^\d{4}$/.test(info)) || new Date().getFullYear().toString();
    const season = metaInfo.find(info => info.includes('Temporada') || info.includes('Otoño') || info.includes('Primavera') || info.includes('Verano') || info.includes('Invierno')) || '';
    const status = metaInfo.find(info => info.includes('emisión') || info.includes('Finalizado')) || 'Desconocido';
    
    // Extraer géneros
    const genres = [];
    $('a[href*="/catalogo?genre="]').each((index, element) => {
      const genre = $(element).text().trim();
      if (genre && !genre.includes('Catalogo') && genre.length < 20) {
        genres.push(genre);
      }
    });
    
    // Extraer información del tráiler
    let trailerUrl = null;
    
    // Buscar datos JSON embebidos en la página que contienen información del tráiler
    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent) {
        try {
          // Buscar patrón de trailer en el JSON con diferentes formatos
          const trailerMatch = scriptContent.match(/["']trailer["']\s*:\s*["']([^"']+)["']/i) ||
                               scriptContent.match(/trailer:\s*["']([^"']+)["']/i) ||
                               scriptContent.match(/"trailer"\s*:\s*"([^"]+)"/i);
          if (trailerMatch && trailerMatch[1] && trailerMatch[1] !== 'null') {
            const trailerId = trailerMatch[1];
            // Construir URL de YouTube
            trailerUrl = `https://www.youtube.com/watch?v=${trailerId}`;
            break;
          }
        } catch (e) {
          // Continuar si hay error parseando
        }
      }
    }
    
    // Si no se encuentra en JSON, buscar enlaces directos de YouTube
    if (!trailerUrl) {
      $('a[href*="youtube.com/watch"], a[href*="youtu.be/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !trailerUrl) {
          trailerUrl = href;
        }
      });
    }
    
    // Buscar iframes embebidos de YouTube
    if (!trailerUrl) {
      $('iframe[src*="youtube"]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !trailerUrl) {
          trailerUrl = src;
        }
      });
    }
    
    // Extraer rating de MAL de forma más específica
    let malRating = '0.0';
    let malVotes = '0';
    
    // Buscar el rating en elementos específicos
    $('.text-2xl.font-bold').each((index, element) => {
      const text = $(element).text().trim();
      if (/^\d+\.\d+$/.test(text)) {
        malRating = text;
      }
    });
    
    // Buscar votos
    $('.font-bold').each((index, element) => {
      const text = $(element).text().trim();
      if (text.includes('votos') || (text.match(/^\d+$/) && parseInt(text) > 100)) {
        malVotes = text.replace(/[^\d]/g, '');
      }
    });
    
    console.log('Extrayendo episodios...');
    const episodes = [];
    
    // Buscar episodios con selectores más amplios
    $('article.group\\/item, .episode-card, article[data-episode]').each((index, element) => {
      const $element = $(element);
      
      // Extraer número de episodio con múltiples selectores
      let episodeNumber = $element.find('.text-lead.font-bold, .episode-number, [data-episode]').text().trim() ||
                         $element.attr('data-episode') ||
                         $element.find('span.text-lead').text().trim();
      
      // Limpiar número de episodio
      episodeNumber = episodeNumber.replace(/[^\d]/g, '');
      
      // Extraer imagen del episodio (screenshot)
      const screenshot = $element.find('img').first().attr('src');
      
      // Extraer enlace del episodio
      const episodeLink = $element.find('a').attr('href');
      
      if (episodeNumber && episodeLink) {
        episodes.push({
          number: episodeNumber,
          title: `Episodio ${episodeNumber}`,
          screenshot: screenshot ? (screenshot.startsWith('http') ? screenshot : `https://animeav1.com${screenshot}`) : null,
          link: episodeLink.startsWith('http') ? episodeLink : `https://animeav1.com${episodeLink}`,
          slug: episodeLink.split('/').pop()
        });
      }
    });
    
    // Si no se encontraron episodios, generar algunos por defecto
    if (episodes.length === 0) {
      for (let i = 1; i <= 12; i++) {
        episodes.push({
          number: i.toString(),
          title: `Episodio ${i}`,
          screenshot: null,
          link: `https://animeav1.com/media/${slug}/${i}`,
          slug: i.toString()
        });
      }
    }
    
    // Ordenar episodios por número
    episodes.sort((a, b) => {
      const numA = parseInt(a.number) || 0;
      const numB = parseInt(b.number) || 0;
      return numA - numB;
    });
    
    const animeDetails = {
      title,
      alternativeTitle,
      slug,
      poster: poster ? (poster.startsWith('http') ? poster : `https://animeav1.com${poster}`) : null,
      backdrop: backdrop ? (backdrop.startsWith('http') ? backdrop : `https://animeav1.com${backdrop}`) : null,
      description,
      type,
      year,
      season,
      status,
      genres: [...new Set(genres)].slice(0, 6), // Eliminar duplicados y limitar
      malRating: malRating || '0.0',
      malVotes: malVotes || '0',
      episodes,
      totalEpisodes: episodes.length,
      episodeRanges: generateEpisodeRanges(episodes.length),
      trailerUrl: trailerUrl || null
    };
    
    // Extraer animes relacionados (temporadas, spin-offs, etc.)
    const relatedAnimes = [];
    
    // Buscar sección de relacionados en el HTML
    const relatedSection = $('section').filter((i, el) => {
      return $(el).find('h2').text().includes('Relacionados');
    });
    
    if (relatedSection.length > 0) {
      // Buscar grupos de años en la línea temporal
      relatedSection.find('.group\\/item').each((index, groupElement) => {
        const $group = $(groupElement);
        const yearText = $group.find('.bg-edge\\/80, .dark\\:bg-mute').text().trim();
        const year = yearText || new Date().getFullYear().toString();
        
        $group.find('article').each((i, element) => {
          const $element = $(element);
          const relatedTitle = $element.find('h3').text().trim();
          const relatedType = $element.find('header span').text().trim();
          const relatedLink = $element.find('a').attr('href');
          const relatedPoster = $element.find('img').attr('src');
          
          if (relatedTitle && relatedLink) {
            const slug = relatedLink.replace('/media/', '');
            relatedAnimes.push({
              title: relatedTitle,
              type: relatedType,
              year,
              slug,
              poster: relatedPoster ? (relatedPoster.startsWith('http') ? relatedPoster : `https://animeav1.com${relatedPoster}`) : null,
              link: relatedLink.startsWith('http') ? relatedLink : `https://animeav1.com${relatedLink}`
            });
          }
        });
      });
    }
    
    const animeDetailsWithRelated = {
      ...animeDetails,
      relatedAnimes
    };
    
    console.log(`Detalles del anime extraídos:`);
    console.log(`- Título: ${title}`);
    console.log(`- Título alternativo: ${alternativeTitle}`);
    console.log(`- Tipo: ${type}`);
    console.log(`- Año: ${year}`);
    console.log(`- Estado: ${status}`);
    console.log(`- Géneros: ${genres.join(', ')}`);
    console.log(`- Rating MAL: ${malRating}`);
    console.log(`- Episodios: ${episodes.length}`);
    console.log(`- Relacionados: ${relatedAnimes.length}`);
    console.log(`- Tráiler: ${trailerUrl || 'No disponible'}`);

    
    return animeDetailsWithRelated;
    
  } catch (error) {
    console.error('Error al obtener detalles del anime:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('URL:', error.config?.url);
    }
    return null;
  }
}



function generateEpisodeRanges(totalEpisodes) {
  const ranges = [];
  const rangeSize = 50;
  
  for (let i = 1; i <= totalEpisodes; i += rangeSize) {
    const end = Math.min(i + rangeSize - 1, totalEpisodes);
    ranges.push({
      label: `${i} - ${end}`,
      start: i,
      end: end
    });
  }
  
  return ranges;
}

module.exports = { getRecentAnimes, searchAnimes, getAnimeDetails };
