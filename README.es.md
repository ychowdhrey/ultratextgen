🌍 Idiomas  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [العربية](README.ar.md) | [Polski](README.pl.md) | [Türkçe](README.tr.md)

# UltraTextGen

UltraTextGen es un generador de texto Unicode rápido y limpio, creado para quienes no quieren perder el tiempo.

- Sin páginas pesadas.
- Sin cargas innecesarias.
- Sin distracciones.

Escribe tu texto, cópialo y sigue adelante.


## Por Qué UltraTextGen

La mayoría de las herramientas de texto decorativo son lentas, recargadas y llenas de efectos que nunca usarás.

UltraTextGen es lo contrario.

Carga al instante  
Funciona por completo en el navegador  
Sin registros, sin ventanas emergentes  
Nada entre tú y el botón de copiar

Está hecho para ahorrar tiempo, no para consumirlo.


## Qué Hace

**Texto con estilo que puedes pegar en cualquier parte.** UltraTextGen convierte
el texto normal en estilos basados en Unicode — 114 en total — que funcionan en
redes sociales y aplicaciones de mensajería. El resultado es texto real, no una
imagen: se copia, se pega y sobrevive allí donde lo pongas.

**Nombres decorados para juegos y perfiles.** Una capa de adornos compone
marcos, coronas y separadores alrededor de un nombre, y un motor de reglas por
juego comprueba el resultado frente al límite de caracteres que el juego
aplicará realmente — antes de gastar un cambio de nombre.

**Salida imprimible y visual, cuando los caracteres no bastan.** Fichas de
práctica en letra burbuja y cursiva, páginas para colorear, texto curvado y en
arco, lettering para tatuajes. Todo se genera como SVG/PNG en tu navegador y es
el paso siguiente para lo que el copiar y pegar no resuelve — calcar, colorear,
imprimir — nunca la respuesta por defecto.

Todo lo anterior se ejecuta en el cliente. Nada se genera en un servidor y no se
descarga ningún archivo de fuente para que funcione.


## Para Quién Es

Creadores que actualizan biografías y pies de foto  
Community managers que prueban variantes  
Comunidades de Discord y gaming  
Cualquiera que quiera énfasis visual sin fricción

Si la velocidad importa, esta herramienta encaja.


## Diseñado Para La Velocidad

UltraTextGen es deliberadamente ligero.

- Sin frameworks
- Sin bundlers
- Sin dependencias en el navegador
- Sin animaciones innecesarias

Todo está pensado para cargar rápido y responder bien incluso con conexiones lentas.


## Filosofía De Diseño

- Rápido antes que vistoso
- Claro antes que ingenioso
- Útil antes que impresionante

Si algo no ayuda al usuario a avanzar más rápido, no se publica.


## Sitio En Vivo

**Página principal:** https://ultratextgen.com

### Qué hay en el sitio

Cada sección de abajo tiene su propia página índice con búsqueda y navegación
incorporadas — es la forma más rápida de encontrar algo. Las cifras se
actualizan cada semana a partir de `sitemap.xml`.

<!-- START_PILLARS -->
| Sección | Páginas en inglés | Páginas localizadas |
|---|---:|---:|
| [Biblioteca](https://ultratextgen.com/library/) | 336 | 1084 |
| [Símbolos](https://ultratextgen.com/symbol/) | 113 | 1652 |
| [Respuestas](https://ultratextgen.com/answers/) | 65 | 75 |
| [Casos de Uso](https://ultratextgen.com/usecase/) | 36 | 144 |
| [Guías](https://ultratextgen.com/guide/) | 32 | 90 |
| [Categorías](https://ultratextgen.com/category/) | 23 | 0 |
| [Novedades](https://ultratextgen.com/updates/) | 11 | 56 |
| [Herramientas Integrables](https://ultratextgen.com/embed/) | 6 | 0 |

**4576 URLs en total**, en 30 idiomas.
<!-- END_PILLARS -->


## Páginas De Plataformas

Páginas dedicadas a cada plataforma principal, para que los estilos se muestren exactamente como se espera.

<!-- START_PLATFORMS -->
### Plataformas de Redes Sociales
**Facebook:** https://ultratextgen.com/facebook/
**Instagram:** https://ultratextgen.com/instagram/
**LinkedIn:** https://ultratextgen.com/linkedin/
**Pinterest:** https://ultratextgen.com/pinterest/
**Snapchat:** https://ultratextgen.com/snapchat/
**TikTok:** https://ultratextgen.com/tiktok/
**X (Twitter):** https://ultratextgen.com/x/
**YouTube:** https://ultratextgen.com/youtube/

### Plataformas de Mensajería
**Discord:** https://ultratextgen.com/discord/
**Telegram:** https://ultratextgen.com/telegram/
**WhatsApp:** https://ultratextgen.com/whatsapp/
<!-- END_PLATFORMS -->


## Idiomas

Gran parte del sitio está localizada, no solo la interfaz: cada idioma tiene sus
propias páginas, escritas para ese mercado en lugar de traducidas
automáticamente del inglés.

<!-- START_LOCALES -->
El sitio está disponible en 30 idiomas:

العربية (`ar`) · Bosanski (`bs`) · Čeština (`cs`) · Dansk (`da`) · Deutsch (`de`) · Español (`es`) · Suomi (`fi`) · Français (`fr`) · हिन्दी (`hi`) · Hrvatski (`hr`) · Magyar (`hu`) · Bahasa Indonesia (`id`) · Italiano (`it`) · 日本語 (`ja`) · 한국어 (`ko`) · Bahasa Melayu (`ms`) · Nederlands (`nl`) · Norsk (`no`) · Polski (`pl`) · Português (`pt`) · Română (`ro`) · Русский (`ru`) · Slovenčina (`sk`) · Српски (`sr`) · Svenska (`sv`) · ไทย (`th`) · Tagalog (`tl`) · Türkçe (`tr`) · Tiếng Việt (`vi`) · 繁體中文 (`zh-tw`)
<!-- END_LOCALES -->


## Herramientas Integrables

Versiones ligeras e integrables de las herramientas de UltraTextGen, pensadas para incrustarse en páginas y plataformas externas.

<!-- START_EMBED -->
- https://ultratextgen.com/embed/bio-font-generator/
- https://ultratextgen.com/embed/character-counter/
- https://ultratextgen.com/embed/linkedin-headline-generator/
- https://ultratextgen.com/embed/name-checker/
- https://ultratextgen.com/embed/nickname-generator/
- https://ultratextgen.com/embed/zalgo-text-generator/
<!-- END_EMBED -->


## Estructura Del Proyecto

```
ultratextgen/
├── index.html               # Página principal
├── style.css                # Hoja de estilos global
├── script.js                # Lógica de interfaz — entrada, rejilla, copia, adornos
├── styles.js                # Registro de estilos Unicode (114 estilos)
├── renderer.js              # Motor de renderizado — despacha según style.type
├── header.js                # Inyector de navegación compartida
├── sitemap.xml              # Generado automáticamente — nunca editar a mano
├── _redirects, _headers     # Configuración de Cloudflare Pages
├── _routes.json             # Enrutado de Pages Functions (solo `/` invoca una)
├── functions/               # Middleware de Cloudflare Pages
│
├── js/                      # Módulos de funcionalidad, uno por directorio
│   ├── flair/               #   packs de decoración de nombres
│   ├── gamename/            #   reglas de nombre por juego + verificador
│   ├── counter/             #   contador de caracteres (con pruebas)
│   ├── printables/          #   motor de fichas imprimibles
│   ├── curved/  tattoo/     #   modos de salida SVG/PNG
│   ├── vertical/  kaomoji/  #   …y unos 20 más
│
├── category/  usecase/      # Pilares de contenido (ver «Qué hay en el sitio»)
├── guide/     answers/
├── library/   symbol/
├── updates/   embed/
│
├── <lang>/                  # 30 árboles localizados del sitio (de/, es/, ja/, …)
│
├── discord/  instagram/     # Páginas de plataformas
├── linkedin/ tiktok/  …
│
├── data/                    # Registros y catálogos que lee el utillaje
├── docs/                    # Documentación técnica y de procesos
└── scripts/                 # Scripts de build, validación y generación
```

`CLAUDE.md` en la raíz del repositorio es la guía técnica completa — reglas de
contenido, flujo de localización, controles de validación y convenciones.


## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript puro (ES6+) — sin frameworks, sin bundlers |
| Salida visual | Canvas/SVG nativos, renderizados en el cliente |
| Utillaje de build | Node.js (sitemap, validadores), Python (generación de recursos) |
| CI/CD | GitHub Actions |
| Alojamiento | Cloudflare Pages + Pages Functions |

El frontend no tiene paso de compilación. Node y Python se usan solo para
utillaje que corre antes del despliegue, nunca en el navegador.


## Desarrollo

```bash
npm install            # Solo utillaje de build — nada llega al navegador

npx serve .            # Servir en local; o: python3 -m http.server 8080
npm run prebuild       # Regenerar sitemap.xml
npm run sync-readme    # Actualizar los bloques generados de este archivo
```

No hay paso de compilación para el frontend — abre `index.html` directamente o
sirve el directorio con cualquier servidor de archivos estáticos.
