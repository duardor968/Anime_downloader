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
    console.log('[INFO] Fetching data from animeav1.com');
    const response = await makeRequest('https://animeav1.com');
    console.log('[INFO] Successfully received response from animeav1.com');
    
    if (!response.data) {
      console.error('[ERROR] No content received from animeav1.com');
      return { recentEpisodes: [], recentAnimes: [], featuredAnimes: [] };
    }

    const $ = cheerio.load(response.data);

    // Extraer animes destacados del carrusel
    console.log('[INFO] Extracting featured animes from carousel');
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

    console.log('[INFO] Extracting recent episodes');
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
        // Extraer slug del anime desde el enlace del episodio
        const animeSlug = link.split('/')[2] || ''; // /media/anime-slug/episode -> anime-slug
        
        recentEpisodes.push({ 
          title, 
          animeSlug,
          poster: poster.startsWith('http') ? poster : `https://animeav1.com${poster}`,
          link: link.startsWith('http') ? link : `https://animeav1.com${link}`,
          timeAgo: timeText || getTimeAgo(new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)),
          episodeNumber
        });
      }
    });

    console.log('[INFO] Extracting recent animes');
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

    console.log('[INFO] Data extraction completed successfully');
    return { recentEpisodes, recentAnimes, featuredAnimes };
  } catch (error) {
    console.error('[ERROR] Failed to fetch animes from animeav1.com:', error.message);
    return { recentEpisodes: [], recentAnimes: [], featuredAnimes: [] };
  }
}

async function searchAnimes(query, page = 1) {
  try {
    console.log(`[INFO] Starting search for: ${query} (page ${page})`);
    const encodedQuery = encodeURIComponent(query);
    const url = `https://animeav1.com/catalogo?search=${encodedQuery}&page=${page}`;
    console.log(`[INFO] Search URL: ${url}`);
    
    const response = await makeRequest(url);
    console.log(`[INFO] Response received, processing HTML...`);
    
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
      
      if (title && poster && link) {
        console.log(`[DEBUG] Found anime: ${title}`);
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
    
    // Extraer información de paginación desde JSON embebido
    let totalResults = 0;
    let totalPages = 1;
    let hasNextPage = false;
    let hasPrevPage = page > 1;
    
    // Buscar datos JSON en los scripts
    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('totalRecords')) {
        try {
          // Buscar patrón: totalRecords:42,categoriesIdsMap
          const totalMatch = scriptContent.match(/totalRecords:(\d+)/);
          const pagesMatch = scriptContent.match(/totalPages:(\d+)/);
          
          if (totalMatch && pagesMatch) {
            totalResults = parseInt(totalMatch[1]);
            totalPages = parseInt(pagesMatch[1]);
            console.log(`[INFO] Found pagination from JSON: ${totalResults} results, ${totalPages} pages`);
            break;
          }
        } catch (e) {
          // Continuar si hay error parseando
        }
      }
    }
    
    // Fallback: extraer del HTML si no se encontró en JSON
    if (totalResults === 0) {
      const resultsText = $('.font-bold').first().text().trim();
      if (resultsText && /^\d+$/.test(resultsText)) {
        totalResults = parseInt(resultsText);
        totalPages = Math.ceil(totalResults / 20);
      }
    }
    
    hasNextPage = page < totalPages;
    
    const paginationInfo = {
      currentPage: page,
      totalPages,
      totalRecords: totalResults,
      hasNextPage,
      hasPrevPage,
      resultsPerPage: animes.length
    };
    
    console.log(`[INFO] Search completed. Found ${animes.length} animes on page ${page} of ${totalPages} (total: ${totalResults})`);
    
    return {
      results: animes,
      pagination: paginationInfo
    };
  } catch (error) {
    console.error(`[ERROR] Search failed for query '${query}' page ${page}:`, error.message);
    if (error.response) {
      console.error('[ERROR] HTTP Status:', error.response.status);
    }
    return {
      results: [],
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalResults: 0,
        hasNextPage: false,
        hasPrevPage: false,
        resultsPerPage: 0
      }
    };
  }
}

async function getAnimeDetails(slug) {
  try {
    console.log(`[INFO] Fetching anime details: ${slug}`);
    const url = `https://animeav1.com/media/${slug}`;
    console.log(`[INFO] Anime URL: ${url}`);
    
    const response = await makeRequest(url);
    console.log('[INFO] Response received, processing anime details...');
    
    const $ = cheerio.load(response.data);
    
    // Buscar el article principal que contiene la información del anime
    const mainArticle = $('article.text-subs.dark.relative').first();
    
    if (!mainArticle.length) {
      console.error(`[ERROR] Main article not found for anime: ${slug}`);
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
    
    console.log('[INFO] Extracting episodes...');
    let allEpisodes = [];
    
    // Primero, intentar obtener el número total de episodios desde los datos JSON embebidos
    let totalEpisodes = 0;
    const episodeScriptTags = $('script').toArray();
    for (const script of episodeScriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('episodesCount')) {
        try {
          const episodeCountMatch = scriptContent.match(/"?episodesCount"?\s*:\s*(\d+)/);
          if (episodeCountMatch) {
            totalEpisodes = parseInt(episodeCountMatch[1]);
            console.log(`[INFO] Found total episodes from JSON: ${totalEpisodes}`);
            break;
          }
        } catch (e) {
          // Continuar si hay error parseando
        }
      }
    }
    
    // Extraer el ID numérico del anime desde los datos JSON
    let animeId = null;
    for (const script of episodeScriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('id:')) {
        try {
          const idMatch = scriptContent.match(/id:\s*(\d+)/) || scriptContent.match(/"id"\s*:\s*(\d+)/);
          if (idMatch) {
            animeId = idMatch[1];
            console.log(`[INFO] Found animeId: ${animeId}`);
            break;
          }
        } catch (e) {
          // Continuar si hay error parseando
        }
      }
    }
    
    // Si encontramos el total de episodios, generar todos los episodios
    if (totalEpisodes > 0) {
      console.log(`[INFO] Generating ${totalEpisodes} episodes for ${slug}`);
      
      for (let i = 1; i <= totalEpisodes; i++) {
        allEpisodes.push({
          number: i.toString(),
          title: `Episodio ${i}`,
          screenshot: animeId ? `https://cdn.animeav1.com/screenshots/${animeId}/${i}.jpg` : null,
          link: `https://animeav1.com/media/${slug}/${i}`,
          slug: i.toString()
        });
      }
    } else {
      // Fallback: scrapear episodios de la página actual
      console.log('[INFO] Scraping episodes from current page...');
      
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
          allEpisodes.push({
            number: episodeNumber,
            title: `Episodio ${episodeNumber}`,
            screenshot: screenshot ? (screenshot.startsWith('http') ? screenshot : `https://animeav1.com${screenshot}`) : null,
            link: episodeLink.startsWith('http') ? episodeLink : `https://animeav1.com${episodeLink}`,
            slug: episodeLink.split('/').pop()
          });
        }
      });
      
      // Si no se encontraron episodios, generar algunos por defecto
      if (allEpisodes.length === 0) {
        console.log('[INFO] No episodes found, generating default episodes...');
        for (let i = 1; i <= 12; i++) {
          allEpisodes.push({
            number: i.toString(),
            title: `Episodio ${i}`,
            screenshot: null,
            link: `https://animeav1.com/media/${slug}/${i}`,
            slug: i.toString()
          });
        }
      }
    }
    
    // Ordenar episodios por número
    allEpisodes.sort((a, b) => {
      const numA = parseInt(a.number) || 0;
      const numB = parseInt(b.number) || 0;
      return numA - numB;
    });
    
    const animeDetails = {
      title,
      alternativeTitle,
      slug,
      animeId: animeId, // ID numérico para screenshots
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
      episodes: allEpisodes,
      totalEpisodes: allEpisodes.length,
      episodeRanges: generateEpisodeRanges(allEpisodes.length),
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
    
    console.log(`[INFO] Anime details extracted successfully:`);
    console.log(`[INFO] - Title: ${title}`);
    console.log(`[INFO] - Type: ${type}`);
    console.log(`[INFO] - Year: ${year}`);
    console.log(`[INFO] - Status: ${status}`);
    console.log(`[INFO] - Episodes: ${allEpisodes.length}`);
    console.log(`[INFO] - Related animes: ${relatedAnimes.length}`);

    
    return animeDetailsWithRelated;
    
  } catch (error) {
    console.error(`[ERROR] Failed to get anime details for '${slug}':`, error.message);
    if (error.response) {
      console.error('[ERROR] HTTP Status:', error.response.status);
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

// Función para obtener los filtros disponibles dinámicamente
async function getAvailableFilters() {
  try {
    console.log('[INFO] Fetching available filters from animeav1.com');
    const response = await makeRequest('https://animeav1.com/catalogo');
    
    if (!response.data) {
      console.error('[ERROR] No content received for filters');
      return null;
    }

    // Hardcoded filters basados en la estructura observada
    // Esto es más confiable que parsear el JavaScript dinámico
    const filtersData = {
      categories: [
        { id: '1', name: 'TV Anime', slug: 'tv-anime' },
        { id: '2', name: 'Película', slug: 'pelicula' },
        { id: '3', name: 'OVA', slug: 'ova' },
        { id: '4', name: 'Especial', slug: 'especial' }
      ],
      genres: [
        { id: '1', name: 'Acción', slug: 'accion' },
        { id: '2', name: 'Aventura', slug: 'aventura' },
        { id: '3', name: 'Ciencia Ficción', slug: 'ciencia-ficcion' },
        { id: '4', name: 'Comedia', slug: 'comedia' },
        { id: '5', name: 'Deportes', slug: 'deportes' },
        { id: '6', name: 'Drama', slug: 'drama' },
        { id: '7', name: 'Fantasía', slug: 'fantasia' },
        { id: '8', name: 'Misterio', slug: 'misterio' },
        { id: '9', name: 'Recuentos de la Vida', slug: 'recuentos-de-la-vida' },
        { id: '10', name: 'Romance', slug: 'romance' },
        { id: '11', name: 'Seinen', slug: 'seinen' },
        { id: '12', name: 'Shoujo', slug: 'shoujo' },
        { id: '13', name: 'Shounen', slug: 'shounen' },
        { id: '14', name: 'Sobrenatural', slug: 'sobrenatural' },
        { id: '15', name: 'Suspenso', slug: 'suspenso' },
        { id: '16', name: 'Terror', slug: 'terror' },
        { id: '17', name: 'Antropomórfico', slug: 'antropomorfico' },
        { id: '18', name: 'Artes Marciales', slug: 'artes-marciales' },
        { id: '19', name: 'Carreras', slug: 'carreras' },
        { id: '20', name: 'Detectives', slug: 'detectives' },
        { id: '21', name: 'Ecchi', slug: 'ecchi' },
        { id: '22', name: 'Elenco Adulto', slug: 'elenco-adulto' },
        { id: '23', name: 'Escolares', slug: 'escolares' },
        { id: '24', name: 'Espacial', slug: 'espacial' },
        { id: '25', name: 'Gore', slug: 'gore' },
        { id: '26', name: 'Gourmet', slug: 'gourmet' },
        { id: '27', name: 'Harem', slug: 'harem' },
        { id: '28', name: 'Histórico', slug: 'historico' },
        { id: '29', name: 'Idols (Hombre)', slug: 'idols-hombre' },
        { id: '30', name: 'Idols (Mujer)', slug: 'idols-mujer' },
        { id: '31', name: 'Infantil', slug: 'infantil' },
        { id: '32', name: 'Isekai', slug: 'isekai' },
        { id: '33', name: 'Josei', slug: 'josei' },
        { id: '34', name: 'Juegos Estrategia', slug: 'juegos-estrategia' },
        { id: '35', name: 'Mahou Shoujo', slug: 'mahou-shoujo' },
        { id: '36', name: 'Mecha', slug: 'mecha' },
        { id: '37', name: 'Militar', slug: 'militar' },
        { id: '38', name: 'Mitología', slug: 'mitologia' },
        { id: '39', name: 'Música', slug: 'musica' },
        { id: '40', name: 'Parodia', slug: 'parodia' },
        { id: '41', name: 'Psicológico', slug: 'psicologico' },
        { id: '42', name: 'Samurai', slug: 'samurai' },
        { id: '43', name: 'Shoujo Ai', slug: 'shoujo-ai' },
        { id: '44', name: 'Shounen Ai', slug: 'shounen-ai' },
        { id: '45', name: 'Superpoderes', slug: 'superpoderes' },
        { id: '46', name: 'Vampiros', slug: 'vampiros' }
      ],
      years: (() => {
        const years = [];
        for (let year = 2025; year >= 1990; year--) {
          years.push(year);
        }
        return years;
      })(),
      status: [
        { id: 'finished', name: 'Finalizado', slug: 'finished' },
        { id: 'airing', name: 'En emisión', slug: 'airing' },
        { id: 'upcoming', name: 'Próximamente', slug: 'upcoming' }
      ],
      orderOptions: [
        { id: 'default', name: 'Predeterminado', slug: 'default' },
        { id: 'title', name: 'Título A-Z', slug: 'title' },
        { id: 'title_desc', name: 'Título Z-A', slug: 'title_desc' },
        { id: 'year', name: 'Año (Nuevo)', slug: 'year' },
        { id: 'year_desc', name: 'Año (Antiguo)', slug: 'year_desc' },
        { id: 'rating', name: 'Puntuación', slug: 'rating' }
      ]
    };
    
    console.log(`[INFO] Filters loaded: ${filtersData.categories.length} categories, ${filtersData.genres.length} genres, ${filtersData.years.length} years`);
    return filtersData;
    
  } catch (error) {
    console.error('[ERROR] Failed to fetch filters:', error.message);
    return null;
  }
}

// Función de búsqueda con filtros
async function searchAnimesWithFilters(options = {}) {
  try {
    const {
      query = '',
      page = 1,
      category = '',
      genre = '',
      year = '',
      status = '',
      letter = '',
      order = 'default'
    } = options;
    
    console.log(`[INFO] Starting filtered search with options:`, options);
    
    // Construir URL con parámetros
    const params = new URLSearchParams();
    
    if (query) params.append('search', query);
    if (page > 1) params.append('page', page.toString());
    if (category) params.append('category', category);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    if (options.minYear) params.append('minYear', options.minYear);
    if (options.maxYear) params.append('maxYear', options.maxYear);
    if (status) params.append('status', status);
    if (letter) params.append('letter', letter);
    if (order && order !== 'default') params.append('order', order);
    
    const url = `https://animeav1.com/catalogo${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`[INFO] Search URL: ${url}`);
    
    const response = await makeRequest(url);
    console.log(`[INFO] Response received, processing HTML...`);
    
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
      
      if (title && poster && link) {
        console.log(`[DEBUG] Found anime: ${title}`);
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
    
    // Extraer información de paginación desde JSON embebido
    let totalResults = 0;
    let totalPages = 1;
    let hasNextPage = false;
    let hasPrevPage = page > 1;
    
    // Buscar datos JSON en los scripts
    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('totalRecords')) {
        try {
          // Buscar patrón: totalRecords:42,categoriesIdsMap
          const totalMatch = scriptContent.match(/totalRecords:(\d+)/);
          const pagesMatch = scriptContent.match(/totalPages:(\d+)/);
          
          if (totalMatch && pagesMatch) {
            totalResults = parseInt(totalMatch[1]);
            totalPages = parseInt(pagesMatch[1]);
            console.log(`[INFO] Found pagination from JSON: ${totalResults} results, ${totalPages} pages`);
            break;
          }
        } catch (e) {
          // Continuar si hay error parseando
        }
      }
    }
    
    // Fallback: extraer del HTML si no se encontró en JSON
    if (totalResults === 0) {
      const resultsText = $('.font-bold').first().text().trim();
      if (resultsText && /^\d+$/.test(resultsText)) {
        totalResults = parseInt(resultsText);
        totalPages = Math.ceil(totalResults / 20);
      }
    }
    
    hasNextPage = page < totalPages;
    
    const paginationInfo = {
      currentPage: page,
      totalPages,
      totalRecords: totalResults,
      hasNextPage,
      hasPrevPage,
      resultsPerPage: animes.length
    };
    
    console.log(`[INFO] Filtered search completed. Found ${animes.length} animes on page ${page} of ${totalPages} (total: ${totalResults})`);
    
    return {
      results: animes,
      pagination: paginationInfo,
      appliedFilters: {
        query,
        category,
        genre,
        year,
        status,
        letter,
        order
      }
    };
  } catch (error) {
    console.error(`[ERROR] Filtered search failed:`, error.message);
    if (error.response) {
      console.error('[ERROR] HTTP Status:', error.response.status);
    }
    return {
      results: [],
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalRecords: 0,
        hasNextPage: false,
        hasPrevPage: false,
        resultsPerPage: 0
      },
      appliedFilters: options
    };
  }
}

module.exports = { getRecentAnimes, searchAnimes, getAnimeDetails, getAvailableFilters, searchAnimesWithFilters };
