# AnimeHub - Anime Downloader

## Introducción

AnimeHub es una aplicación web moderna que permite buscar y explorar animes utilizando los datos de AnimeAV1.com. La aplicación extrae los enlaces de descarga almacenados en AnimeAV1.com y los envía directamente a JDownloader para su descarga automática, sin descargar contenido directamente desde el sitio web.

## Lenguajes y Frameworks usados

[![Node.js](https://skillicons.dev/icons?i=nodejs)](https://nodejs.org/)
[![Express](https://skillicons.dev/icons?i=express)](https://expressjs.com/)
[![JavaScript](https://skillicons.dev/icons?i=js)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TailwindCSS](https://skillicons.dev/icons?i=tailwind)](https://tailwindcss.com/)
[![HTML](https://skillicons.dev/icons?i=html)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://skillicons.dev/icons?i=css)](https://developer.mozilla.org/en-US/docs/Web/CSS)

## Características

- **Búsqueda avanzada** - Busca animes por título con resultados en tiempo real
- **Diseño responsive** - Interfaz optimizada para desktop y móvil
- **Tema oscuro moderno** - Diseño minimalista con colores personalizados
- **Exploración de animes** - Navega por animes recientes, destacados y relacionados
- **Descarga automática** - Integración con JDownloader para descargas automáticas
- **Soporte para proxy** - Compatible con redes corporativas y proxies del sistema
- **Scraping híbrido** - Sistema de respaldo con curl para máxima compatibilidad

## Instalación

### Prerrequisitos

- Node.js 16+ 
- npm o yarn
- JDownloader 2 (para descargas)
- curl (para redes con proxy)

### Configuración

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd AnimeDownloader
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar JDownloader**
   - Abrir JDownloader 2
   - Ir a **Configuración** → **Configuración avanzada**
   - Buscar `Deprecated Api` y habilitar la API local
   - Configurar puerto a 3128

4. **Configurar proxy** (si es necesario)
```bash
# Windows
set HTTP_PROXY=http://proxy.empresa.com:8080
set HTTPS_PROXY=http://proxy.empresa.com:8080

# Linux/Mac
export HTTP_PROXY=http://proxy.empresa.com:8080
export HTTPS_PROXY=http://proxy.empresa.com:8080
```

5. **Iniciar el servidor**
```bash
npm start
# o
node server.js
```

6. **Abrir en el navegador**
```
http://localhost:3000
```

## Configuración avanzada

### Variables de entorno

```bash
# Proxy del sistema
HTTP_PROXY=http://proxy:8080
HTTPS_PROXY=http://proxy:8080
NO_PROXY=localhost,127.0.0.1

# Puerto del servidor (opcional)
PORT=3000
```

## Sistema de red híbrido

El proyecto incluye un sistema único que maneja automáticamente problemas de conectividad:

1. **Axios nativo** - Intento principal con soporte de proxy
2. **Fallback a curl** - Si axios falla (común en redes corporativas)
3. **Detección automática** - Usa variables de entorno del sistema

Esto garantiza compatibilidad con:
- Redes domésticas
- Proxies corporativos (Kerio Control, etc.)
- Firewalls restrictivos
- Conexiones VPN

## Funcionalidades principales

### Página principal
- Carrusel de animes destacados
- Episodios recientes
- Animes populares
- Navegación intuitiva

### Búsqueda
- Campo de búsqueda minimalista
- Resultados en tiempo real
- Filtros por género y tipo

### Detalles del anime
- Información completa (sinopsis, géneros, rating)
- Timeline de animes relacionados
- Lista de episodios con screenshots
- Descarga individual o masiva

### Descargas
- Integración con JDownloader
- Progreso en tiempo real
- Descarga por lotes
- Gestión de errores

## Desarrollo

### Scripts disponibles

```bash
# Iniciar servidor de desarrollo
npm start

# Ejecutar tests (si están configurados)
npm test
```

### Estructura de rutas

```javascript
GET  /                    # Página principal
GET  /search             # Búsqueda de animes
GET  /media/:slug        # Detalles del anime
POST /download           # Descarga masiva
POST /download-episode   # Descarga individual
GET  /api/search         # API de búsqueda
```

## Solución de problemas

### Error de conexión
```bash
# Verificar conectividad
node test-connectivity.js

# Probar sistema híbrido
node test-hybrid.js
```

### Problemas con proxy
```bash
# Verificar configuración
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Probar proxy simple
node test-simple-proxy.js
```

### JDownloader no conecta
1. Asegurar que JDownloader esté ejecutándose
2. Verificar que JDownloader está escuchando en el puerto 3128 (Si acabas de activar la API recuerda reiniciar JDownloader)

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Soporte

Si encuentras algún problema o tienes sugerencias:

1. Revisa los [issues existentes](../../issues)
2. Crea un nuevo issue con detalles del problema
3. Incluye logs y configuración relevante