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
- **Tema oscuro moderno** - Diseño minimalista con degradados azules personalizados
- **Carrusel interactivo** - Navegación automática con controles manuales y barra de progreso
- **Exploración de animes** - Navega por animes recientes, destacados y relacionados
- **Descarga automática** - Integración con JDownloader para descargas automáticas
- **Progreso en tiempo real** - Seguimiento de descargas con Server-Sent Events
- **Binarios compilados** - Ejecutables independientes con Node.js SEA (Single Executable Applications)
- **Soporte para proxy** - Compatible con redes corporativas y proxies del sistema
- **Scraping híbrido** - Sistema de respaldo con curl para máxima compatibilidad
- **TailwindCSS compilado** - Estilos optimizados y rápidos

## Instalación

### Requisitos previos (para ambas opciones)

- **JDownloader 2** - Necesario para las descargas
- **curl** - Para redes con proxy (opcional)

### Opción 1: Binarios Compilados (Recomendado)

**Descarga directa sin necesidad de Node.js:**

1. **Descargar desde [Releases](../../releases)**
   - `AnimeHub-v<versión>-windows.exe` (Windows)
   - `AnimeHub-v<versión>-linux` (Linux)

2. **Ejecutar directamente**
```bash
# Windows
.\AnimeHub-v<versión>-windows.exe

# Linux
chmod +x AnimeHub-v<versión>-linux
./AnimeHub-v<versión>-linux
```

3. **Abrir en el navegador**
```
http://localhost:3000
```

### Opción 2: Desde Código Fuente

**Prerrequisitos adicionales:**
- Node.js 20+ 
- npm o yarn

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd AnimeDownloader
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Compilar TailwindCSS**
```bash
npx tailwindcss -i ./src/input.css -o ./public/css/tailwind.css --minify
```

4. **Iniciar el servidor**
```bash
npm start
# o
node server.js
```

5. **Abrir en el navegador**
```
http://localhost:3000
```

## Configuración de JDownloader

**Necesario para ambas versiones:**

1. **Configurar JDownloader**
   - Abrir JDownloader 2
   - Ir a **Configuración** → **Configuración avanzada**
   - Buscar `Deprecated Api` y habilitar la API local
   - Configurar puerto a 3128

2. **Configurar proxy** (si es necesario)
```bash
# Windows
set HTTP_PROXY=http://proxy.empresa.com:8080
set HTTPS_PROXY=http://proxy.empresa.com:8080

# Linux/Mac
export HTTP_PROXY=http://proxy.empresa.com:8080
export HTTPS_PROXY=http://proxy.empresa.com:8080
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
# Desarrollo (nodemon + Tailwind en watch minificado)
npm run dev

# Solo servidor (sin watch de estilos)
npm start

# Compilar TailwindCSS (one-shot minificado)
npm run build:css
```

> TailwindCSS 4: la configuración vive en `src/input.css` usando `@import "tailwindcss";` y `@source` (no se usa `tailwind.config.js`). El CLI se sirve desde `@tailwindcss/cli` y se invoca con `tailwindcss` como en los comandos anteriores.

### Automatización CI (GitHub Actions)

El flujo `.github/workflows/build.yml` construye binarios para Windows y Linux al crear un tag `v*`. Pasos:
- `npm ci`
- `npm run generate:assets`
- `tailwindcss` (si existe `src/input.css`)
- `build-sea.bat` en Windows / `build-sea.sh` en Linux
- Publica artefactos `animehub-<os>` con el contenido de `release/`

### Compilar binarios (SEA auto‑contenidos)

Los binarios ahora incrustan `public/`, `views/` y un manifiesto de assets dentro del ejecutable SEA. Solo necesitas el binario generado en `release/`.

Requisitos: Node.js 20+, npm, y que `node` esté disponible en PATH (Windows necesita `node.exe` instalado).

```bash
# Windows (PowerShell o CMD)
./build-sea.bat

# Linux / WSL / macOS
chmod +x build-sea.sh
./build-sea.sh
```

Los scripts:
- leen la versión desde `package.json` para nombrar el binario (`AnimeHub-v<versión>-<os>`),
- generan el manifiesto de assets (`npm run generate:assets`),
- empaquetan con `@vercel/ncc`,
- crean el blob SEA y lo inyectan en el binario de Node con `postject`,
- (Windows) insertan icono/metadata con `resedit-cli` usando `public/images/favicon.ico`.

El binario resultante queda en `release/` y no requiere carpetas auxiliares.

Notas de build:
- Windows: si `upx` está disponible, el script intenta comprimir el ejecutable y aplica un parche de cabeceras PE para evitar errores de UPX.
- Linux: UPX se omite por compatibilidad (los binarios SEA suelen fallar con `bad e_phoff`).

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
