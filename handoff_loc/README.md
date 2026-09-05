# Handoff: League of Coaching (LoC)

Herramienta de coaching para jugadores de League of Legends. El usuario registra una o varias
cuentas de juego y la app le devuelve análisis de su rendimiento: rango y progreso de LP, historial
de partidas, lecciones accionables y objetivos del split.

**No es un buscador de invocadores** (a diferencia de op.gg / u.gg). No hay búsqueda por nombre: el
contexto siempre es *tus* cuentas. El selector del header cambia la cuenta activa y todos los
paneles se recalculan.

## Qué implementar

| Doc | Pantalla |
|---|---|
| `01-auth.md` | Login / registro / registro de cuenta de juego (3 pasos, un layout) |
| `02-dashboard.md` | Panel: Cuentas, Partidas, Aprendizaje, Objetivos (4 vistas, un shell) |
| `03-objetivos.md` | **Rediseño de la vista Objetivos** — reemplaza la sección "Vista 4" de `02-dashboard.md` |

Empezá por `01-auth.md`: define los componentes base (input, botón, chip, checkbox) que el
dashboard reutiliza.

**`03-objetivos.md` manda sobre la "Vista 4 — Objetivos" de `02-dashboard.md`.** Esa sección quedó
obsoleta: describe tarjetas en grilla con solo un porcentaje; el rediseño usa filas con brecha y
ritmo. Ignorala e implementá `03-objetivos.md`.

## Contexto técnico

- **Auth: Clerk.** El detalle de integración y el mapeo de `appearance` está en `01-auth.md`.
- **Sin API de Riot todavía.** No hay clave de producción, así que los datos de perfil de juego se
  cargan **a mano** y viven en tu base. El diseño se lo dice al usuario de forma explícita (aviso
  "Beta sin sincronía automática" + badge "MANUAL"). Guardá un flag
  `source: 'manual' | 'riot_api'` por cuenta desde el día uno: cuando se apruebe el acceso, la
  sincronía sobrescribe los manuales sin migración.
- **Legal.** El copy ya declara "no afiliado a Riot Games" en el pie y en los términos —
  mantenelo. Antes de publicar, revisá la política de aplicaciones de terceros de Riot: es el
  mismo trámite que desbloquea la sincronía.

## About the Design Files

Los archivos de `design/` son **referencias de diseño hechas en HTML** — prototipos que muestran la
apariencia y el comportamiento previstos, no código de producción para copiar tal cual.

La tarea es **recrear estos diseños en el entorno existente del codebase** usando sus patrones y
librerías establecidas. Si todavía no hay entorno, elegí el framework apropiado (React/Next.js, que
es lo que asume la integración con Clerk) e implementalos ahí.

Los `.dc.html` usan un runtime propio de prototipado (`support.js`): plantilla HTML con huecos
`{{ }}` más una clase de lógica que devuelve los valores. **No portar ese runtime.** Leelo como un
componente React con `state` y valores derivados: `renderVals()` es el cuerpo del render y la
plantilla es el JSX.

Para verlos en vivo, abrí cualquiera de los dos `.dc.html` en el navegador (con `support.js` en la
misma carpeta). Incluye los cambios de vista, de cuenta y de paso.

### Cómo leer un `.dc.html`
- Lo que está entre `<x-dc>` y `</x-dc>` es la plantilla (equivalente al JSX).
- `{{ algo }}` es un valor devuelto por `renderVals()` al final del archivo.
- `<sc-for list="{{ items }}" as="item">` es un `.map()`; `<sc-if value="{{ cond }}">` es un render
  condicional.
- Los estilos van inline. Los calculados (colores por resultado, anchos de barra, chips activos) se
  construyen como strings en `renderVals()`. Al portar, convertilos en variantes de componente o
  clases utilitarias en vez de concatenar CSS.

## Fidelity

**Alta fidelidad.** Colores, tipografía, espaciados y estados son finales. Placeholders explícitos,
listados por pantalla en cada doc. Los dos globales:

- **Cuadros con rayas diagonales + iniciales** = imagen que falta (avatar, campeón, objeto).
  Patrón: `repeating-linear-gradient(135deg,#1d222c,#1d222c 5px,#252b37 5px,#252b37 10px)`.
  Sustituir por assets reales de **Data Dragon / Community Dragon** cuando haya acceso.
- **Nombres de campeón anonimizados** ("Campeón A"…"Campeón J") para no fijar un meta concreto.

---

# Design Tokens (compartidos)

## Colores

| Rol | Valor |
|---|---|
| Fondo de página | `#07080b` |
| Sidebar | `linear-gradient(180deg,#0a0c10,#080a0d)` |
| Panel de formulario (auth) | `#0a0c10` |
| Panel de marca (auth) | `linear-gradient(150deg,#12161d,#0d1116 48%,#151018)` |
| Superficie de tarjeta / input | `#0e1116` (input en focus `#101419`) |
| Superficie hero | `linear-gradient(115deg,#12161d,#0f1319 46%,#141017)` |
| Superficie sutil | `rgba(255,255,255,.025)` — `rgba(255,255,255,.055)` |
| Borde por defecto | `rgba(255,255,255,.06)` — `rgba(255,255,255,.11)` |
| Borde dorado | `rgba(216,181,106,.18)` — `rgba(216,181,106,.6)` |
| Acento (oro) | `#d8b56a` |
| Botón dorado | `linear-gradient(180deg,#e0c07a,#c2a05a)` |
| Texto sobre acento | `#141109` |
| Texto dorado | `#e2c483` · `#c8a862` · `#b99b58` |
| Texto primario | `#f3ece0` / `#f1e6cf` / `#f0e9dd` (títulos) · `#eae4d8` / `#e8e4da` / `#e0dbcf` / `#dcd7cb` |
| Texto secundario | `#9aa0ac` · `#868b96` · `#8d919c` |
| Texto tenue | `#787d88` · `#6f747f` · `#5c616b` · `#585d67` |
| Victoria / positivo | `#63b7dc` · `#5fceac` |
| Derrota / negativo | `#cd6a63` |
| Estado en línea | `#3fae8f` |
| Tier EMERALD | `#4fd6b0` (texto `#63dcb8`) |
| Tier PLATINUM | `#5fb6d8` |
| Tier DIAMOND | `#7fa9f0` |
| Tier MASTER | `#b980e0` |

Regla de color: **azul `#63b7dc` = victoria, rojo `#cd6a63` = derrota, verde `#5fceac` = positivo /
por encima de la media, oro = acción y marca.** El oro nunca significa "bueno", significa
"accionable".

## Tipografía

- **Chakra Petch** 500/600/700 — wordmark, H1/H2, tiers, resultado de partida. Siempre con
  letter-spacing (.09em–.14em en labels y wordmark, ~0 en H1).
- **IBM Plex Sans** 400/500/600 — cuerpo, nombres, labels de botón, inputs.
- **IBM Plex Mono** 400/500/600 — **todo dato numérico**, eyebrows y labels de campo (mayúsculas,
  ls .14em–.24em), metadatos.

Escala: 46 / 30 / 28 / 24 / 22 / 21 / 20 / 19 / 17 / 16 / 15 / 14.5 / 14 / 13.5 / 13 / 12.5 / 12 /
11.5 / 11 / 10.5 / 10 / 9.5 / 9 / 8.5 px.

Google Fonts: `Chakra+Petch:wght@500;600;700`, `IBM+Plex+Sans:wght@400;500;600`,
`IBM+Plex+Mono:wght@400;500;600`.

## Radios
3 (barras finas) · 4 (checkbox) · 5 · 6 · 7 · 8 · 9 (inputs, botones) · 10 · 11 · 12 · 13 · 14 ·
20 (pastillas) · 50% (puntos, anillos).

## Sombras
- Botón dorado: `0 2px 14px rgba(216,181,106,.22)`
- Hexágono de rango: `inset 0 0 40px rgba(216,181,106,.13)`
- Punto de estado: `0 0 8px rgba(63,174,143,.7)` (verde) / `0 0 8px rgba(216,181,106,.6)` (oro)
- Header del panel: `backdrop-filter: blur(8px)`, sin sombra

## Animaciones
Solo dos, ambas decorativas y con `prefers-reduced-motion` pendiente de implementar:
```css
@keyframes loc-pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }          /* punto de estado, 2.4s */
@keyframes loc-drift { 0%,100% { transform:translateY(0) rotate(45deg) }
                       50%     { transform:translateY(-9px) rotate(45deg) } } /* rombo del auth, 9s */
```
En los prototipos se llaman `hfpulse` / `hfdrift` — renombralas al portar.

## Scrollbar
```css
::-webkit-scrollbar { width: 8px; height: 8px }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px }
::-webkit-scrollbar-track { background: transparent }
```

## Links
Definir siempre, incluso donde no haya links todavía: `a { color:#c8a862; text-decoration:none }`,
`a:hover { color:#e2c483 }`.

---

# Marca

## El icono
`assets/loc-mark.svg` — una curva de LP que se arrastra plana y **rompe un techo de estancamiento**.
Los dos fragmentos grises del techo quedan desalineados a propósito (`y=46` a la izquierda, `y=40` a
la derecha): se rompió, no se abrió una puerta. Esa asimetría es el concepto — no la "arregles".

- **Sin placa de fondo.** El mark va directo sobre el fondo de la app.
- viewBox `0 0 96 96`. Se usa a 30px (sidebar del panel) y 32px (auth).
- Tres colores: techo `#585d67`, curva `#c2a05a`, punta `#e8cb8b`.
- Por debajo de ~24px, subí los `stroke-width` (curva ~12, techo ~10) o el mark se deshace. Para
  favicon y app icon, generá variantes de peso — no escales el mismo SVG.
- Los fragmentos de "grieta" (dos rayitas cortas a 45°) existen solo en la variante grande (96px).

## Wordmark
Eyebrow "LEAGUE OF COACHING" (Mono 600 9px, ls .22em, `#6f747f`) sobre "LoC"
(Chakra Petch 700 20px/1.2, ls .14em, `#f1e6cf`, margin-top 3px). Gap de 11px entre icono y texto.
En el panel el eyebrow y el wordmark se apilan igual, con el icono a 30px.

**Nunca** escribas "LoC" en minúsculas ni "Loc". El nombre completo es "League of Coaching".

---

# Layout y responsive

Los dos prototipos están a **1440 px de ancho** fijo, desktop-first, sin breakpoints. Eso es una
limitación del prototipo, no una decisión de producto. Al implementar:

- **Auth** (`minmax(0,1fr) 560px`): por debajo de ~1024px ocultá el panel de marca y centrá el
  formulario a `max-width:460px`. En móvil, el panel de marca puede volverse una cabecera compacta
  con solo icono + H1.
- **Dashboard** (`236px 1fr`, con columna derecha de 336px): por debajo de ~1280px bajá la columna
  derecha debajo del contenido principal; por debajo de ~1024px colapsá el sidebar a solo iconos.

Las medidas fijas que importan: sidebar **236px**, columna derecha del panel **336px**, columna de
formulario del auth **560px**.

---

# Lo que falta diseñar

No está en los prototipos y hay que resolverlo antes de shippear:

- **Estados de carga** por panel (skeletons) y en los botones.
- **Errores**: credenciales inválidas, email ya registrado, verificación de email (Clerk pide un
  código de 6 dígitos), Riot ID con formato inválido, rate limit.
- **Estados vacíos**: usuario sin cuentas registradas, cuenta sin partidas, sin objetivos.
- **Hovers** de los elementos clicables que hoy solo tienen `cursor:pointer` (filas de partida,
  tarjetas de cuenta, ítems de nav inactivos). Sugerencia consistente: elevar el fondo a
  `rgba(255,255,255,.04)`.
- **Foco visible por teclado** en todo lo interactivo. Los prototipos solo definen `:focus` en
  inputs; hace falta un anillo para botones, chips, tabs y filas.
- **Accesibilidad**: los chips y tabs son `<div onClick>` en el prototipo — implementalos como
  `<button>` con `aria-pressed` / `role="tab"`. Los checkboxes necesitan input real.
  Varios pares texto-tenue-sobre-oscuro (`#5c616b` en `#0a0c10`) quedan por debajo de 4.5:1 —
  úsalos solo en metadatos no esenciales o subilos a `#787d88`.

## Files
```
design/
  LoC Auth.dc.html        referencia visual del auth
  LoC Dashboard.dc.html   referencia visual del panel
  Objetivos Options.dc.html  4 opciones para Objetivos — implementar la 1A
  support.js              runtime del prototipo — NO portar, solo para ver los .dc.html
assets/
  loc-mark.svg            el icono, listo para usar
01-auth.md                spec del login / registro
02-dashboard.md           spec del panel
03-objetivos.md           spec del rediseño de Objetivos (pisa la Vista 4 del anterior)
```
