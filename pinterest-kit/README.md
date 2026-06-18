# UltraTextGen — Tablero de Pinterest en Español (HOW-TO)

Kit listo para subir un tablero de Pinterest en español que lleve tráfico a
**https://ultratextgen.com/es/**. Las ideas y prioridades salen de datos reales:
el export de Semrush (`letras bonitas`, broad match, México) y el de Google
Search Console de la página `/es/` (últimos 6 meses).

## Contenido del kit
```
pinterest-kit/
├── README.md          ← esta guía (estrategia + cómo subir)
├── pin-copy.md        ← copy completo de los 20 pines (título, descripción, hashtags, link)
├── pins.csv           ← hoja para subir en lote (archivo → título/descripción/link/tablero/keywords)
├── generate.py        ← script que genera las imágenes (reproducible)
└── images/            ← 20 PNG listos (1000×1500, formato vertical de Pinterest)
```

## Por qué estos pines (resumen de datos)
- La página `/es/` rankea en **posición media ~5,9** en Google: está en la
  página 1 pero pierde el clic. Pins en Pinterest + Google Imágenes ayudan a subir.
- **89 % del tráfico es móvil** → texto grande y legible en miniatura (ya aplicado).
- Mercados: **México** (#1), Chile, Colombia, EE. UU. hispano, Rep. Dominicana
  → copy en español neutro.
- Lo que ya convierte para ti: *letras + símbolos*, *cursivas*, *otros idiomas /
  aesthetic*, *para Instagram / Facebook / Free Fire* → forman la columna del tablero.
- **Se excluyó a propósito** el cluster de escritura a mano / imprimir
  (`moldes`, `para imprimir`, `en libreta`, `a mano`): mucho volumen pero el
  generador digital no lo resuelve y esa visita rebota. Los pines 16 y 18
  *puentean* esa intención ("no las dibujes, cópialas").

## Configuración del tablero
- **Nombre:** `Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas`
- **Descripción:** ver `pin-copy.md` (incluye keywords).
- **Destino de los pines:** `https://ultratextgen.com/es/` con `?q=` para precargar
  el texto y que la persona aterrice viendo su resultado ya transformado.

## Cómo subir (manual, ~10 min — recomendado)
1. Entra a Pinterest → **Crear → Crear tablero** y usa el nombre de arriba.
2. **Crear pin** → arrastra una imagen de `images/`.
3. Copia el **Título**, la **Descripción** y el **Enlace de destino** desde
   `pins.csv` (o `pin-copy.md`) en la fila con el mismo nombre de archivo.
4. Publica 1–2 pines al día siguiendo el orden sugerido en `pin-copy.md`
   (Pinterest premia la constancia, no subas los 20 de golpe).

## Cómo subir (en lote)
Si usas una herramienta de programación (Pinterest "Bulk create" para cuentas
business, Tailwind, Metricool, Buffer, etc.), importa `pins.csv`: ya trae
archivo, título, descripción, link, tablero y keywords por fila.

## Regenerar / editar las imágenes
```bash
pip install pillow
python3 pinterest-kit/generate.py     # regenera los 20 PNG en images/
```
Las muestras de estilo se renderizan con fuentes display reales (cursiva,
blackletter, etc.) como proxy de alta nitidez de la salida Unicode del generador.
Edita la lista `PINS` en `generate.py` para cambiar textos, colores o estilos.

> Nota: este entorno no tiene integración con Pinterest, así que la **publicación
> es manual** (o con tu herramienta de programación). Todo lo demás está listo.
