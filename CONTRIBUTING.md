# Contributing to AnimeHub

¡Gracias por tu interés en contribuir a AnimeHub! Este documento te guiará a través del proceso de contribución.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Configuración del entorno de desarrollo](#configuración-del-entorno-de-desarrollo)
- [Proceso de contribución](#proceso-de-contribución)
- [Guías de estilo](#guías-de-estilo)
- [Reportar bugs](#reportar-bugs)
- [Sugerir mejoras](#sugerir-mejoras)

## Código de Conducta

Este proyecto se adhiere al [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Al participar, se espera que mantengas este código. Por favor reporta comportamientos inaceptables a duardo.r968@gmail.com.

## ¿Cómo puedo contribuir?

### 🐛 Reportar Bugs
- Usa el template de issue para bugs
- Incluye pasos para reproducir el problema
- Especifica tu sistema operativo y versión de AnimeHub
- Adjunta logs si es posible

### 💡 Sugerir Mejoras
- Usa el template de issue para feature requests
- Explica claramente el problema que resuelve
- Describe la solución propuesta
- Considera alternativas

### 🔧 Contribuir Código
- Fork el repositorio
- Crea una rama para tu feature/fix
- Sigue las guías de estilo
- Añade tests si es aplicable
- Actualiza documentación si es necesario

### 📚 Mejorar Documentación
- Corrige errores tipográficos
- Mejora explicaciones
- Añade ejemplos
- Traduce contenido

## Configuración del entorno de desarrollo

### Prerrequisitos
- Node.js 16+
- npm o yarn
- Git

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/AnimeDownloader.git
cd AnimeDownloader

# Instalar dependencias
npm install

# Compilar CSS
npm run build:css

# Iniciar servidor de desarrollo
npm start
```

### Herramientas opcionales
- **ImageMagick**: Para regenerar iconos
- **Inkscape**: Para conversión SVG de alta calidad
- **JDownloader 2**: Para probar funcionalidad de descarga

## Proceso de contribución

### 1. Fork y Clone
```bash
git clone https://github.com/tu-usuario/AnimeDownloader.git
cd AnimeDownloader
git remote add upstream https://github.com/usuario-original/AnimeDownloader.git
```

### 2. Crear rama
```bash
git checkout -b feature/nueva-funcionalidad
# o
git checkout -b fix/corregir-bug
```

### 3. Hacer cambios
- Mantén commits pequeños y enfocados
- Usa mensajes de commit descriptivos
- Sigue las convenciones de código existentes

### 4. Probar cambios
```bash
# Probar la aplicación
npm start

# Compilar binarios (opcional)
./build.bat
```

### 5. Commit y Push
```bash
git add .
git commit -m "feat: añadir nueva funcionalidad X"
git push origin feature/nueva-funcionalidad
```

### 6. Crear Pull Request
- Usa el template de PR
- Describe claramente los cambios
- Referencia issues relacionados
- Añade screenshots si es aplicable

## Guías de estilo

### JavaScript
- Usa ES6+ cuando sea posible
- Prefiere `const` y `let` sobre `var`
- Usa nombres descriptivos para variables y funciones
- Comenta código complejo
- Mantén funciones pequeñas y enfocadas

### CSS/TailwindCSS
- Usa clases de Tailwind cuando sea posible
- Mantén CSS personalizado en `custom-theme.css`
- Usa nombres de clase descriptivos
- Organiza estilos por componente

### HTML/EJS
- Usa indentación consistente (2 espacios)
- Mantén estructura semántica
- Usa partials para código reutilizable
- Incluye atributos de accesibilidad

### Commits
Usa [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: añadir nueva funcionalidad
fix: corregir bug específico
docs: actualizar documentación
style: cambios de formato
refactor: refactorizar código
test: añadir tests
chore: tareas de mantenimiento
```

## Reportar bugs

### Antes de reportar
- Busca en issues existentes
- Verifica que uses la versión más reciente
- Prueba en un entorno limpio

### Información a incluir
- **Versión de AnimeHub**: (ej. v1.2.1)
- **Sistema operativo**: (ej. Windows 11, Ubuntu 22.04)
- **Navegador**: (si aplica)
- **Pasos para reproducir**: Detallados y específicos
- **Comportamiento esperado**: Qué debería pasar
- **Comportamiento actual**: Qué está pasando
- **Logs/Screenshots**: Si están disponibles

## Sugerir mejoras

### Tipos de mejoras bienvenidas
- Nuevas funcionalidades de scraping
- Mejoras de UI/UX
- Optimizaciones de rendimiento
- Mejor manejo de errores
- Soporte para nuevos sitios web
- Mejoras de accesibilidad

### Formato de sugerencia
- **Problema**: ¿Qué problema resuelve?
- **Solución**: ¿Cómo lo resolvería?
- **Alternativas**: ¿Qué otras opciones consideraste?
- **Contexto**: ¿Por qué es importante?

## Estructura del proyecto

```
AnimeDownloader/
├── public/           # Assets estáticos
│   ├── css/         # Estilos compilados
│   ├── js/          # JavaScript del cliente
│   └── images/      # Imágenes y iconos
├── views/           # Templates EJS
│   └── partials/    # Componentes reutilizables
├── utils/           # Utilidades del servidor
├── release/         # Archivos de release
└── docs/           # Documentación adicional
```

## Preguntas frecuentes

### ¿Puedo contribuir sin saber programar?
¡Sí! Puedes:
- Reportar bugs
- Sugerir mejoras
- Mejorar documentación
- Traducir contenido
- Probar nuevas versiones

### ¿Cómo puedo probar mis cambios?
1. Ejecuta `npm start` para servidor de desarrollo
2. Prueba funcionalidades específicas
3. Verifica que no rompas funcionalidad existente
4. Compila binarios si modificas dependencias

### ¿Qué pasa si mi PR es rechazado?
- Revisaremos y daremos feedback constructivo
- Puedes hacer cambios y volver a enviar
- Algunas ideas pueden no alinearse con la visión del proyecto

## Reconocimientos

Todos los contribuidores serán reconocidos en:
- README.md
- Changelog de releases
- Créditos en la aplicación (para contribuciones significativas)

## Contacto

- **Issues**: Para bugs y sugerencias
- **Discussions**: Para preguntas generales
- **Email**: duardo.r968@gmail.com (para temas sensibles)

¡Gracias por contribuir a AnimeHub! 🎌