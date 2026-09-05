# 02 — Dashboard

Archivo de referencia: `design/LoC Dashboard.dc.html`.
Tokens, marca y responsive: ver `README.md`. Componentes base (input, botón, chip, checkbox):
ver `01-auth.md`.

## Overview

Cuatro vistas mutuamente excluyentes dentro de un shell fijo (sidebar + header), controladas por
`state.view`: **Cuentas** (home), **Partidas**, **Aprendizaje**, **Objetivos**. Vista inicial:
Cuentas.

Sin búsqueda de invocador. El contexto es siempre la **cuenta activa**, elegida en el header o en el
sidebar; al cambiarla, todos los paneles se recalculan.

## Layout global

`display:grid; grid-template-columns: 236px 1fr`. Fondo `#07080b`.

```
┌──────────┬──────────────────────────────────────┐
│ sidebar  │ header (sticky, 61px)                │
│ (236px)  ├──────────────────────────────────────┤
│          │ vista activa (padding 26px 28px 40px)│
└──────────┴──────────────────────────────────────┘
```

### Sidebar — 236px, `padding: 22px 16px 16px`

Fondo `linear-gradient(180deg,#0a0c10,#080a0d)`, borde derecho `1px solid rgba(255,255,255,.06)`.
De arriba a abajo:

1. **Lockup de marca** (`padding: 0 6px 22px`): icono a 30px + eyebrow/wordmark (ver README).
2. **Label "NAVEGACIÓN"** (Mono 600 9px, ls .2em, `#585d67`, `padding: 0 8px 10px`).
3. **Nav** (flex column, gap 3px). Ítems con contador: Cuentas (3), Partidas (nº de partidas de la
   cuenta activa), Aprendizaje (6), Objetivos (4).
   - Ítem: `display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px`.
     Pastilla de 3×15px radius 2px a la izquierda; label `flex:1`; contador a la derecha
     (Mono 500 10px `#6f747f`).
   - Inactivo: texto Sans 400 13.5px `#9aa0ac`, fondo y borde transparentes, pastilla
     `rgba(255,255,255,.13)`.
   - Activo: texto 600 `#f3e8d1`, fondo
     `linear-gradient(90deg,rgba(216,181,106,.14),rgba(216,181,106,.03))`, borde
     `1px solid rgba(216,181,106,.28)`, pastilla = color de acento.
4. **Label "CUENTAS VINCULADAS"** (margin-top 26px, mismo estilo de label).
   → Renombrar a "CUENTAS REGISTRADAS" mientras la carga sea manual: "vinculada" implica OAuth.
5. **Lista de cuentas** (gap 4px). Fila: `padding:8px 9px; border-radius:9px; gap:9px`; avatar
   36×36 radius 9px; nombre Sans 500 12.5px `#dcd7cb` con ellipsis; subtítulo de rango
   Mono 400 10px `#787d88`; punto de 6px a la derecha con el color del tier.
   Seleccionada: fondo `rgba(255,255,255,.055)`, borde `1px solid rgba(255,255,255,.09)`.
6. **"+ Vincular cuenta Riot"** — botón fantasma (ver `01-auth.md`), texto Sans 500 11.5px.
   → Renombrar a "+ Registrar cuenta" y llevar al paso 3 del onboarding.
7. **Spacer** (`flex:1`) y **tarjeta de usuario** al fondo: `padding:11px; radius:10px;` fondo
   `rgba(255,255,255,.03)`, borde `1px solid rgba(255,255,255,.06)`. Avatar rayado 32×32; nombre
   Sans 500 12.5px `#ddd8cc`; email Mono 400 10px `#6f747f` con ellipsis; punto de estado 7px
   `#3fae8f` con `box-shadow: 0 0 8px rgba(63,174,143,.7)`.
   → Debe ser el `<UserButton />` de Clerk, estilado para encajar.

### Header — sticky, `padding: 16px 28px`

Fondo `rgba(10,12,16,.7)` + `backdrop-filter: blur(8px)`, borde inferior
`1px solid rgba(255,255,255,.06)`, `z-index:5`, gap 16px.

1. Contexto: "LAS · TEMPORADA 15 · SPLIT 3" — Mono 400 11px `#6f747f`, ls .06em.
2. **Selector de cuenta en análisis** — `padding:7px 12px 7px 9px; radius:8px;` fondo `#0e1116`,
   borde `1px solid rgba(255,255,255,.08)`; hover borde `rgba(216,181,106,.4)`. Contiene avatar
   24×24 radius 6px, un bloque de dos líneas (eyebrow "CUENTA EN ANÁLISIS" Mono 600 8.5px ls .18em
   `#6f747f`; nombre Sans 500 12.5px `#dcd7cb`) y un chevron "▾" Mono 400 10px.
   → En el prototipo **cicla** las cuentas al hacer clic. En producción debe ser un
   **dropdown/popover** con la lista. El ciclo es solo un atajo del prototipo.
3. Spacer `flex:1`.
4. Estado de sincronía: punto 6px `#3fae8f` con `animation: loc-pulse 2.4s infinite` +
   "SINCRONIZADO HACE 4 MIN" (Mono 400 11px `#787d88`).
   → Sin API, este texto **miente**. Cambialo a "CARGA MANUAL · SIN SINCRONÍA" con el punto en oro
   `#c2a05a`, o esconde el bloque hasta que exista la sincronía.
5. Botón **"Sincronizar ahora"** — botón primario, `padding:9px 15px`, Sans 600 12.5px.
   → Mismo problema: sin API no hay nada que sincronizar. Reemplazalo por "Cargar partida" (abre el
   formulario de alta manual) hasta que se apruebe el acceso.

---

## Vista 1 — Cuentas (home)

**Propósito:** de un vistazo, cómo va la cuenta activa esta semana y qué cuentas existen.

Layout: `grid-template-columns: minmax(0,1fr) 336px; gap:22px; align-items:start`.

### Columna izquierda (gap 20px)

#### a) Encabezado de página
Flex, `align-items:flex-end`, space-between.
- Eyebrow "BIENVENIDO DE VUELTA" (Mono 600 9.5px, ls .24em, `#b99b58`).
- H1 (Chakra Petch 700 30px/1.1 `#f3ece0`): "Tu progreso semanal", o **"Tu semana en revisión"** si
  el LP neto de la cuenta es negativo.
- Párrafo de insight (Sans 400 13px/1.5 `#868b96`, `max-width:52ch`, `text-wrap:pretty`) — copy por
  cuenta, generado del análisis. Ejemplos en el prototipo:
  - "Subiste 128 LP en 14 partidas. Tu winrate con jungla es 22 puntos mayor que en cualquier otra
    línea."
  - "Perdiste 14 LP en 18 partidas. Tu winrate se mantiene en 50% pero tu KDA cayó por tercera
    semana."
- Segmentado a la derecha (gap 8px): "7 días" (inactivo: borde `rgba(255,255,255,.1)`, texto
  `#b9beca`) y "Split" (activo: borde `rgba(216,181,106,.4)`, fondo `rgba(216,181,106,.1)`, texto
  `#e2c483`). Ambos `padding:8px 13px; radius:7px;` Sans 500 12px.
  → **No implementado.** Al implementarlo debe refiltrar los paneles de esta columna.

#### b) Tarjeta hero
`radius:14px`, borde `1px solid rgba(216,181,106,.18)`, fondo
`linear-gradient(115deg,#12161d 0%,#0f1319 46%,#141017 100%)`, `overflow:hidden`, con una capa
absoluta de brillo `radial-gradient(680px 240px at 88% -30%,rgba(216,181,106,.14),transparent 70%)`
y `pointer-events:none`.
Interior: `grid-template-columns: auto minmax(0,1fr); gap:26px; padding:24px 26px`.

**Panel de rango** (izquierda, centrado, gap 12px, `padding-right:26px`, borde derecho
`1px solid rgba(255,255,255,.07)`):
- Rombo de 104×104: `transform:rotate(45deg); radius:14px;` borde
  `1px solid rgba(216,181,106,.35)`, fondo
  `linear-gradient(160deg,rgba(216,181,106,.2),rgba(20,24,31,.9))`,
  `box-shadow: inset 0 0 40px rgba(216,181,106,.13)`. Dentro, contrarrotado, un crest de 34×34
  rotado 45° con el degradado del tier. → Sustituir por el **emblema real del tier**.
- Tier (Chakra Petch 700 17px, ls .09em) en el color del tier; debajo "75 LP · SOLO/DÚO"
  (Mono 500 11px `#787d88`).
- Barra de progreso de 150px de ancho: pista 5px radius 4px `rgba(255,255,255,.08)`; relleno
  `linear-gradient(90deg,#1d7f6a,<color del tier>)`. Debajo, tier actual → siguiente
  (Mono 400 9.5px; el destino en `#b99b58`).

**Panel derecho** (flex column, gap 18px):
- **Identidad**: avatar 44×44 radius 10px; nombre (Chakra Petch 700 20px `#f0e9dd`) + tag
  (Mono 500 11px `#787d88`) + badge "ACTIVA" (`padding:3px 8px; radius:20px;` fondo
  `rgba(63,174,143,.14)`, borde `1px solid rgba(63,174,143,.35)`, Mono 600 9px ls .14em `#5fceac`);
  segunda línea "NIVEL 342 · LAS · MAESTRÍA 1.2M" (Mono 400 11.5px `#6f747f`).
  A la derecha, alineado al final: winrate (Mono 600 22px `#63b7dc`) y victorias/derrotas
  (Mono 400 10.5px `#787d88`).
- **Gráfico de LP**: contenedor `radius:11px`, fondo `rgba(0,0,0,.28)`, borde
  `1px solid rgba(255,255,255,.06)`, `padding:14px 16px`. Cabecera: label "LP · ÚLTIMAS N PARTIDAS"
  (Mono 600 9.5px ls .18em `#787d88`) y delta neto (Mono 600 12px; `#5fceac` si positivo,
  `#cd6a63` si negativo).
  SVG `viewBox="0 0 620 96"`, `preserveAspectRatio="none"`, alto 96px: dos líneas de rejilla
  horizontales en y=24 e y=60 (`rgba(255,255,255,.05)`), un área con degradado vertical `#63dcb8`
  .3 → 0, y una polyline `stroke:#63dcb8; stroke-width:2; stroke-linejoin:round`.
  **Escala:** dominio = `[min(serie) − 12, max(serie) + 12]`, mapeado al alto menos 8px de margen.
  → `preserveAspectRatio="none"` deforma el stroke al estirarse. Si te molesta, renderizá con el
  ancho real del contenedor en vez de escalar.
- **4 stat tiles** (`grid-template-columns:repeat(4,1fr); gap:10px`): cada una
  `padding:12px 13px; radius:10px;` fondo `rgba(255,255,255,.025)`, borde
  `1px solid rgba(255,255,255,.06)`; label Mono 600 9px ls .16em `#6f747f`, valor Mono 600 21px
  (margin-top 10px, color por métrica), sub Mono 400 10.5px `#787d88` (margin-top 5px).
  Métricas: KDA PROMEDIO (`#e0dbcf`), CS / MIN (`#5fceac` si está sobre la media del elo, si no
  `#e0dbcf`), RACHA (`#63b7dc` si es de victorias, `#cd6a63` si es de derrotas), LÍNEA (acento).

#### c) "TODAS LAS CUENTAS"
Título Chakra Petch 600 14px ls .11em `#dcd6c9`; a la derecha "3 PERFILES · 3 CLASIFICADAS"
(Mono 400 10.5px `#6f747f`). Grid `repeat(3,minmax(0,1fr)); gap:14px`.

Tarjeta (clicable, selecciona la cuenta): `radius:12px`, fondo `#0e1116`, borde
`1px solid rgba(255,255,255,.07)`. Seleccionada: borde `rgba(216,181,106,.3)`, fondo
`linear-gradient(165deg,rgba(216,181,106,.07),#0e1116)`.
- Cabecera `padding:14px 15px 12px`: avatar 36×36; nombre Sans 600 14px `#eae4d8` (ellipsis);
  región Mono 400 10.5px `#787d88`; botón "⋯" de 22×22 radius 6px borde
  `1px solid rgba(255,255,255,.09)` color `#6f747f` (sin menú implementado — debería abrir
  editar / quitar cuenta).
- Dos filas de cola (`padding:9px 0`, borde superior `1px solid rgba(255,255,255,.055)`).
  **Orden: primero la cola que define el rango mostrado en el hero.** Cada fila: rombo de 26×26
  rotado 45° (radius 5px; con rango: fondo `linear-gradient(150deg,<tier>55,rgba(20,24,31,.9))`,
  borde `rgba(255,255,255,.16)`; sin rango: fondo `rgba(255,255,255,.03)`, borde
  `rgba(255,255,255,.09)`); nombre de cola Mono 600 8.5px ls .16em `#6f747f`; tier
  Chakra Petch 600 12px ls .07em en color de tier (o `#6f747f` si SIN CLASIFICAR); a la derecha LP
  (Mono 500 11px `#a9aeb9`) y winrate + partidas (Mono 400 10px `#787d88`).

#### d) "ÚLTIMAS PARTIDAS"
Contenedor `radius:13px`, borde `1px solid rgba(255,255,255,.07)`, fondo `#0e1116`,
`overflow:hidden`. Cabecera `padding:14px 18px` con borde inferior; título Chakra Petch 600 13px
ls .11em; link "Ver todas →" (Sans 500 11.5px `#c8a862`) → vista Partidas.
Muestra las **4 primeras** filas de partida en variante compacta (ver **Fila de partida**).

### Columna derecha — 336px, gap 16px

Las tres tarjetas comparten: `radius:13px`, borde `1px solid rgba(255,255,255,.07)`, fondo
`#0e1116`, `padding:16px 17px`.

**a) ACTIVIDAD SEMANAL**
- 7 columnas (flex, gap 8px, alto 96px, `align-items:flex-end`, margin `18px 0 10px`). Cada columna
  es flex column `justify-content:flex-end; gap:3px`: barra de victorias
  (`linear-gradient(180deg,#63b7dc,#2b6f8c)`) sobre barra de derrotas
  (`linear-gradient(180deg,#cd6a63,#7d3a36)`), **26px de alto por partida**, radius 3px.
  → El alto fijo por partida desborda el contenedor de 96px con más de 3 partidas en un día.
  Normalizá contra el máximo de la semana.
- Etiquetas L M X J V S D (Mono 400 9.5px `#6f747f`, centradas).
- Pie (margin-top 16px, padding-top 14px, borde superior `1px solid rgba(255,255,255,.06)`,
  gap 16px): VICTORIAS (Mono 600 17px `#63b7dc`), DERROTAS (`#cd6a63`), EN JUEGO (`#e0dbcf`,
  formato "3.4h"). Los tres se derivan de las barras — en el prototipo las horas son
  `partidas × 0.49`; usá la duración real.

**b) CAMPEONES DEL SPLIT**
Cabecera con label y contador "N J" (Mono 400 10px `#5c616b`). Filas `padding:11px 0`, borde
inferior `1px solid rgba(255,255,255,.05)`, gap 11px: tile 32×32 radius 8px con iniciales; nombre
Sans 500 12.5px `#ddd8cc` con una barra de 3px debajo (margin-top 7px, pista
`rgba(255,255,255,.07)`, relleno `#63b7dc` si WR ≥ 50%, `#cd6a63` si no); a la derecha (ancho 58px)
winrate (Mono 600 12.5px, mismo criterio de color) y partidas (Mono 400 9.5px `#787d88`).

**c) OBJETIVO ACTIVO**
Borde `1px solid rgba(216,181,106,.2)`, fondo
`linear-gradient(160deg,rgba(216,181,106,.08),rgba(14,17,22,.6))`.
Label "OBJETIVO ACTIVO" (Mono 600 9.5px ls .2em `#c8a862`); título "Llegar a Diamond IV antes del
30 de septiembre" (Chakra Petch 700 16px/1.3 `#f0e9dd`, margin-top 10px); barra de 6px radius 4px
al 68% (`linear-gradient(90deg,#c2a05a,#e8cb8b)`) + "68%" (Mono 600 11.5px `#e2c483`); nota
Sans 400 11.5px/1.5 `#8d919c`; botón fantasma "Ver todos los objetivos" (`padding:9px; radius:8px;`
borde `1px solid rgba(216,181,106,.35)`, texto Sans 500 12px `#e2c483`, centrado) → vista Objetivos.
→ **Hardcodeado** al objetivo de rango. Debe leer el objetivo activo de la cuenta seleccionada.

---

## Vista 2 — Partidas

**Propósito:** revisar el historial con filtros y agregados.

`padding:26px 28px 40px; flex column; gap:18px`.

1. Eyebrow con la cuenta activa en mayúsculas ("BATHROOM ACC #XDD") + H1 "Historial de partidas"
   (Chakra Petch 700 28px/1.1).
2. **Filtros** (flex wrap, gap 8px): "Todas las colas", "Clasif. solo/dúo", "Flexible", "Normal",
   "Últimos 20 días". Pastillas `padding:8px 14px; radius:20px;` Sans 500 12px, mismos estados que
   el chip de selección de `01-auth.md`.
   → **Estáticos en el prototipo.** Deben filtrar la lista y los agregados.
3. **3 tarjetas de agregados** (`repeat(3,1fr); gap:14px`): `padding:15px 17px; radius:12px;` fondo
   `#0e1116`, borde `1px solid rgba(255,255,255,.07)`, flex gap 14px. Anillo de 64px con
   `conic-gradient(<color> 0 P%, rgba(255,255,255,.07) P% 100%)` y un disco interior de 52px
   `#0e1116` con el valor (Mono 600 14px en el color). A la derecha: label (Mono 600 9.5px ls .16em
   `#787d88`) y detalle (Sans 500 12.5px `#c9cdd6`).
   - WINRATE · N PARTIDAS — `#63b7dc`, P = winrate.
   - KDA PROMEDIO — `#5fceac`, P = `min(100, KDA × 20)`.
   - LP NETO DEL SPLIT — acento, P = `min(100, |LP|)`.
   → El anillo del LP neto no distingue signo: −14 y +14 se ven igual. Diferenciá el color.
4. **Lista completa** de 8 partidas en un contenedor `radius:13px`, fondo `#0e1116`, borde
   `1px solid rgba(255,255,255,.07)`, `overflow:hidden`. Igual que la fila corta, más la línea
   "hace 2 h / ayer / hace 2 d" (Mono 400 10px `#5c616b`) y primera columna de 130px en vez de 118px.
   → Sin paginación ni scroll infinito. Hace falta.

### Fila de partida (componente compartido)

`position:relative; display:flex; align-items:center; gap:16px;`
`padding:13px 18px` (cómodo) o `9px 18px` (compacto), `padding-left:26px`, borde inferior
`1px solid rgba(255,255,255,.05)`, `cursor:pointer`.
Fondo `rgba(99,183,220,.045)` en victoria, `rgba(205,106,99,.045)` en derrota.
Color de resultado: **victoria `#63b7dc`, derrota `#cd6a63`**.

1. Barra de acento absoluta a la izquierda: 3px de ancho, `top:0; bottom:0`, color del resultado.
2. Icono de campeón: 42×42 (36 en compacto), radius 9px, borde `1px solid rgba(255,255,255,.1)`,
   fondo rayado, iniciales Mono 600 12px `#9aa0ac`.
3. Resultado (Chakra Petch 700 13px ls .1em en color de resultado) + "COLA · duración"
   (Mono 400 10.5px `#787d88`). Ancho 118px (130 en la lista completa).
4. KDA "12 / 2 / 9" (Mono 600 13.5px `#e0dbcf`) + ratio "10.5 KDA" (Mono 400 10.5px `#787d88`).
   Ancho 112px.
5. CS "241 (7.9)" (Mono 500 12px `#c3c8d3`) + "28 visión" (Mono 400 10.5px `#787d88`). Ancho 104px.
6. Daño (`flex:1`): fila "DAÑO" / "31.4k" (Mono 400 10px `#787d88`) y barra de 4px radius 3px,
   pista `rgba(255,255,255,.07)`, relleno `linear-gradient(90deg,<color>66,<color>)` con el
   percentil de daño de la partida. Ocultable con el tweak `showDamageBars`.
7. 6 slots de objeto: 21×21 (18 en compacto), radius 5px, borde `1px solid rgba(255,255,255,.07)`;
   los 5 primeros con fondo rayado, el sexto (trinket) `rgba(255,255,255,.03)`.
8. Delta de LP (ancho 52px, alineado a la derecha, Mono 600 13px): `#5fceac` si ganó, `#cd6a63` si
   perdió, `#5c616b` si es "—" (partida no clasificatoria).

→ La fila es `cursor:pointer` pero **no lleva a ningún lado**. Debería abrir el detalle de la
partida — es la pantalla que más falta en el producto.

---

## Vista 3 — Aprendizaje

**Propósito:** lecciones accionables derivadas de las últimas partidas. Es el núcleo del coaching.

Eyebrow "BASADO EN LAS ÚLTIMAS N PARTIDAS DE ‹CUENTA›" + H1 "Aprendizaje".
Grid `repeat(3,minmax(0,1fr)); gap:14px`.

Tarjeta: `radius:13px`, borde `1px solid rgba(255,255,255,.07)`, fondo `#0e1116`, `overflow:hidden`,
flex column.
- **Zona de medio**: 118px de alto, fondo rayado
  `repeating-linear-gradient(135deg,#141821,#141821 8px,#191e28 8px,#191e28 16px)`, borde inferior
  `1px solid rgba(255,255,255,.06)`, con el tipo de medio centrado (Mono 400 10px ls .1em `#6f747f`).
  → Placeholder explícito. Acá va el **clip de repetición / mapa de calor / gráfico de oro** real.
- **Cuerpo** `padding:15px 17px 17px; gap:9px`: tag (Mono 600 9px ls .18em `#b99b58`), título
  (Sans 600 14.5px/1.35 `#eae4d8`), texto (Sans 400 12px/1.5 `#868b96`, `text-wrap:pretty`), y meta
  al fondo (`margin-top:auto; padding-top:12px;` Mono 500 11.5px `#787d88`).

Las 6 lecciones están en el `.dc.html`. → **Son estáticas y no cambian con la cuenta.** En
producción deben venir del análisis de la cuenta activa.

---

## Vista 4 — Objetivos

**Propósito:** metas del split con progreso medible.

Cabecera: eyebrow "SPLIT 3 · 27 DÍAS RESTANTES", H1 "Objetivos", y botón primario
"+ Nuevo objetivo". → El formulario de alta no existe; hace falta.

Grid `repeat(2,minmax(0,1fr)); gap:14px`. Tarjeta `padding:18px 19px; radius:13px;` fondo `#0e1116`,
borde `1px solid rgba(255,255,255,.07)`, flex column gap 13px: tipo (Mono 600 9.5px ls .18em
`#787d88`) + badge de estado; título (Chakra Petch 700 17px/1.3 `#f0e9dd`); nota
(Sans 400 12.5px/1.5 `#868b96`); barra de 6px radius 4px con porcentaje (Mono 600 11.5px `#c9cdd6`)
pegada al fondo (`margin-top:auto`).

Estados (badge `padding:3px 9px; radius:20px;` Mono 600 8.5px ls .14em):

| Estado | Texto / borde | Fondo | Relleno de barra |
|---|---|---|---|
| COMPLETADO (100%) | `#63b7dc` / `rgba(99,183,220,.35)` | `rgba(99,183,220,.12)` | `linear-gradient(90deg,#2b6f8c,#63b7dc)` |
| EN CURSO | `#e2c483` / `rgba(216,181,106,.35)` | `rgba(216,181,106,.12)` | `linear-gradient(90deg,#c2a05a,#e8cb8b)` |
| ATRASADO | `#cd6a63` / `rgba(205,106,99,.35)` | `rgba(205,106,99,.12)` | `linear-gradient(90deg,#7d3a36,#cd6a63)` |

4 objetivos, estáticos: RANGO 68% en curso, CONSISTENCIA 47% en curso, MECÁNICA 31% atrasado,
HÁBITO 100% completado.

---

## Interactions & Behavior

- **Navegación**: clic en un ítem del nav cambia `view`, sin transición. "Ver todas →" → Partidas.
  "Ver todos los objetivos" → Objetivos.
- **Cambio de cuenta**: el selector del header cicla (0→1→2→0); clic en una fila del sidebar o en
  una tarjeta de "TODAS LAS CUENTAS" la selecciona **y vuelve a la vista Cuentas**.
  Al cambiar de cuenta se recalculan: identidad, tier/LP/progreso, winrate, headline, serie de LP,
  las 4 stat tiles, actividad semanal, campeones, contador del nav, eyebrows de Partidas y
  Aprendizaje, y los agregados de Partidas. **No** cambian las 6 lecciones ni los 4 objetivos.
- **Hovers**: solo el botón "+ Vincular cuenta Riot" y el selector del header tienen hover propio.
  El resto de elementos clicables lleva `cursor:pointer` pero sin feedback — añadí uno consistente.
- **Animación**: solo `loc-pulse` en el punto de sincronía.
- **En producción `view` debería salir del routing** (`/panel`, `/panel/partidas`,
  `/panel/aprendizaje`, `/panel/objetivos`) y la cuenta activa de la URL o de una preferencia
  persistida, no de estado local.

## State

```js
state = {
  view: 'Cuentas',   // 'Cuentas' | 'Partidas' | 'Aprendizaje' | 'Objetivos'
  account: 0         // índice de la cuenta activa
}
```

Props tweakables del prototipo (overlay del host, no UI de la app):
- `accent` (color, default `#d8b56a`) — pastilla del nav activo, tile de LÍNEA, anillo de LP neto.
- `density` (`Cómodo` | `Compacto`) — padding de fila de partida (13px→9px), icono de campeón
  (42→36), slots de objeto (21→18).
- `showDamageBars` (boolean, default true) — muestra u oculta el relleno de la barra de daño.

En producción, `accent` y `density` son buenas preferencias de usuario; `showDamageBars` es más bien
una densidad de columnas de la tabla.

Todo lo demás se deriva por render de la cuenta activa. `accRaw` en `renderVals()` del `.dc.html`
contiene los datos de las tres cuentas de ejemplo y es el mejor punto de partida para el modelo de
datos.

## Datos que necesita el backend

Con carga manual (hoy) o desde la API de Riot + tu capa de análisis (después):

- **Cuentas**: nombre, tag, región, nivel, maestría, icono, `source`.
- **Por cuenta y cola**: tier, división, LP, progreso al siguiente tier, victorias/derrotas.
- **Historial de partidas**: resultado, campeón, KDA, CS y CS/min, visión, daño y percentil de daño,
  objetos, duración, cola, delta de LP, timestamp.
- **Agregados**: serie de LP, winrate, KDA promedio, CS/min, racha, distribución de líneas,
  actividad diaria, winrate por campeón.
- **Capa de coaching**: lecciones (tag, título, cuerpo, medio adjunto) y objetivos (tipo, título,
  nota, progreso, estado).

Los agregados son todos derivables del historial — no los guardes duplicados, calculalos (y
cacheálos) desde las partidas.
