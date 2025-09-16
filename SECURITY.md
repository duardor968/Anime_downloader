# Security Policy

## Supported Versions

Las siguientes versiones de AnimeHub reciben actualizaciones de seguridad:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :x:                |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### Cómo reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad en AnimeHub, por favor:

1. **NO** abras un issue público
2. Envía un reporte privado a través de:
   - GitHub Security Advisories (recomendado)
   - Email directo: duardo.r968@gmail.com

### Qué incluir en tu reporte

- Descripción detallada de la vulnerabilidad
- Pasos para reproducir el problema
- Versión afectada del software
- Impacto potencial de la vulnerabilidad
- Cualquier solución temporal que hayas encontrado

### Proceso de respuesta

- **Confirmación inicial:** Dentro de 72 horas
- **Evaluación:** 5-7 días hábiles
- **Corrección:** Según la severidad (crítica: 1-3 días, alta: 1-2 semanas)
- **Divulgación:** Después de que la corrección esté disponible

### Política de divulgación responsable

- Mantendremos la confidencialidad hasta que se publique una corrección
- Te acreditaremos en el changelog si lo deseas
- Publicaremos un advisory de seguridad después de la corrección

## Consideraciones de seguridad

AnimeHub es una aplicación de escritorio que:
- Se ejecuta localmente en tu sistema
- No almacena credenciales sensibles
- Utiliza conexiones HTTPS para scraping web
- Integra con JDownloader mediante API local

### Recomendaciones de uso seguro

- Mantén actualizada tu versión de AnimeHub
- Usa la versión oficial desde GitHub Releases
- Verifica la integridad de los binarios descargados
- Ejecuta en un entorno con permisos limitados si es posible