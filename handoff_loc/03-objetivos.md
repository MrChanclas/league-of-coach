# Objetivos — rediseño "Brecha" (reemplaza la vista actual)

Referencia visual: `design/Objetivos Options.dc.html`, opción **1A** (el índice de arriba salta
directo). Tokens y componentes base: ver `README.md` y `01-auth.md` del handoff principal.

## Qué cambia y por qué

La vista actual muestra el porcentaje de avance y nada más. El porcentaje no es accionable: "83%"
no le dice al jugador qué hacer hoy. Este rediseño mantiene la barra pero mueve el protagonismo a
**dos datos nuevos**:

1. **La brecha** — cuánto falta, en la unidad del objetivo (10 puntos de WR, 157 LP), no en
   porcentaje.
2. **El ritmo** — la brecha traducida a acción concreta ("4 victorias seguidas", "8 LP por día").

Además pasa de tarjetas en grilla a **filas**, así que aguanta diez objetivos sin crecer y se
escanea de arriba abajo.

## Layout

Un contenedor: `border-radius:14px`, borde `1px solid rgba(255,255,255,.07)`, fondo `#0e1116`,
`overflow:hidden`. Ancho completo de la columna de contenido.

### Cabecera
`display:flex; align-items:center; justify-content:space-between; padding:18px 22px;`
borde inferior `1px solid rgba(255,255,255,.06)`.

- Izquierda: eyebrow "TUS METAS" (Mono 600 9.5px, ls .24em, `#b99b58`) y H1 "Objetivos"
  (Chakra Petch 700 24px/1.2 `#f3ece0`, margin-top 9px).
- Derecha (gap 14px): "27 DÍAS RESTANTES" (Mono 400 11px `#6f747f`) y el botón primario
  "+ Nuevo objetivo" (`padding:9px 15px`, Sans 600 12.5px — ver botón primario en `01-auth.md`).

### Fila de objetivo
`display:grid; grid-template-columns: 120px minmax(0,1fr) 190px 150px; align-items:center;`
`gap:22px; padding:20px 22px;` borde inferior `1px solid rgba(255,255,255,.05)`.
La última fila no lleva borde inferior.

**Columna 1 — tipo y estado (120px)**
- Tipo (ROL / CAMPEÓN / RANGO / CONSISTENCIA / MECÁNICA / HÁBITO): Mono 600 9px, ls .18em, `#787d88`.
- Badge de estado debajo (`margin-top:11px`), `display:inline-block; padding:4px 9px;
  border-radius:20px;` Mono 600 8.5px ls .14em. Colores por estado en la tabla de más abajo.

**Columna 2 — el objetivo (`minmax(0,1fr)`)**
- Título: Chakra Petch 700 17px/1.25 `#f0e9dd`.
- Estado actual: Mono 400 12px `#787d88`, `margin-top:8px`. Formato "Actual: 50% WR (16 partidas)".
- Barra: pista `height:5px; border-radius:4px; background:rgba(255,255,255,.08); overflow:hidden;
  margin-top:12px`. Relleno `width:<pct>%; height:100%; border-radius:4px;` con el degradado del
  estado.

**Columna 3 — la brecha (190px, `text-align:right`)**
- Número: Mono 600 **30px** `#e2c483`. Es el elemento más grande de la fila, a propósito.
- Label debajo: Mono 400 10px, ls .14em, `#6f747f`, `margin-top:7px`. Nombra la unidad:
  "PUNTOS DE WR", "LP RESTANTES", "PARTIDAS", "DÍAS".

**Columna 4 — el ritmo (150px)**
`padding-left:20px`, borde izquierdo `1px solid rgba(255,255,255,.07)`, flex column gap 7px.
- Acción: Sans 500 12px/1.4 `#c9cdd6` — "4 victorias seguidas", "8 LP por día",
  "6 victorias en 8 partidas".
- Contexto: Mono 400 10.5px `#6f747f` — "PARA CERRARLO", "EN 27 DÍAS", "RITMO NECESARIO".

## Estados

| Estado | Texto / borde del badge | Fondo del badge | Relleno de barra |
|---|---|---|---|
| EN CURSO | `#e2c483` / `rgba(216,181,106,.35)` | `rgba(216,181,106,.12)` | `linear-gradient(90deg,#c2a05a,#e8cb8b)` |
| COMPLETADO | `#63b7dc` / `rgba(99,183,220,.35)` | `rgba(99,183,220,.12)` | `linear-gradient(90deg,#2b6f8c,#63b7dc)` |
| ATRASADO | `#cd6a63` / `rgba(205,106,99,.35)` | `rgba(205,106,99,.12)` | `linear-gradient(90deg,#7d3a36,#cd6a63)` |

**El color de la brecha (columna 3) sigue al estado**: `#e2c483` en curso, `#cd6a63` atrasado.
En COMPLETADO la brecha no aplica — reemplazá el número por un "✓" en `#63b7dc` (Mono 600 30px) y
el label por "CUMPLIDO", más la fecha de cumplimiento en la columna de ritmo.

## Los tres objetivos de ejemplo

Son los de la vista actual, con los dos campos nuevos calculados:

| Tipo | Título | Actual | % | Brecha | Label | Ritmo | Contexto |
|---|---|---|---|---|---|---|---|
| ROL | ADC: 60% WR | 50% WR (16 partidas) | 83 | 10 | PUNTOS DE WR | 4 victorias seguidas | PARA CERRARLO |
| CAMPEÓN | Nilah: 60% WR | 40% WR · 1.3 KDA (10 partidas) | 67 | 20 | PUNTOS DE WR | 6 victorias en 8 partidas | RITMO NECESARIO |
| RANGO | SoloQ: llegar a EMERALD IV | PLATINUM III · 43 LP | 36 | 157 | LP RESTANTES | 8 LP por día | EN 27 DÍAS |

## Cálculo de la brecha y el ritmo

Esto es la parte nueva del backend. Por tipo de objetivo:

**Winrate** (rol o campeón)
```
brecha  = wr_objetivo − wr_actual                       → en puntos
ritmo   = victorias consecutivas necesarias para que
          (victorias + n) / (partidas + n) ≥ wr_objetivo
```
Con 8V/16J y meta 60%: `(8+n)/(16+n) ≥ 0.6` → n = 4. De ahí sale "4 victorias seguidas".
Si el número sale absurdo (más de ~15), cambiá el fraseo a "6 victorias en 8 partidas" — es decir,
el winrate necesario sobre una ventana razonable en vez de una racha.

**Rango**
```
brecha  = LP totales entre el rango actual y el objetivo
          (100 LP por división + los LP de la división actual)
ritmo   = ceil(brecha / días restantes del split)        → "8 LP por día"
```
PLATINUM III 43 LP → EMERALD IV: 57 restantes de PLAT III + 100 (PLAT II) + 100 (PLAT I) = 257…
ajustá según cómo modeles las divisiones. El ejemplo usa 157 (dos divisiones).

**Conteo** (partidas, sesiones, hábitos)
```
brecha  = objetivo − hecho                               → "12 PARTIDAS"
ritmo   = ceil(brecha / días restantes)                  → "1 partida por día"
```

Guardá `target_value`, `current_value` y `unit` por objetivo; la brecha y el ritmo se **derivan**,
no se persisten.

```
goals
  id
  clerk_user_id       FK
  game_account_id     FK
  type                'rol' | 'campeon' | 'rango' | 'consistencia' | 'mecanica' | 'habito'
  title
  unit                'wr_points' | 'lp' | 'games' | 'days'
  target_value
  current_value
  baseline_value      valor al crear el objetivo (para el %)
  deadline
  status              'en_curso' | 'completado' | 'atrasado'
  created_at
```
El `%` de la barra es `(current − baseline) / (target − baseline)`, acotado a 0–100 — no
`current / target`, o un objetivo que arranca en 40% ya nace al 67%.

**`status` es derivado, no manual:** ATRASADO cuando el ritmo necesario supera el ritmo histórico
del jugador en esa métrica (o simplemente cuando quedan menos días que los que el ritmo requiere).

## Interacciones

- **Fila entera clicable** → detalle del objetivo, o filtra Partidas por ese rol/campeón. La vista
  actual no lleva a ningún lado; esto es lo que le falta.
- **Hover de fila**: fondo `rgba(255,255,255,.03)`.
- **Quitar objetivo**: la vista actual tiene una "×" de 22×22 arriba a la derecha de cada tarjeta.
  Acá no hay lugar fijo — mostrá las acciones (editar / archivar / eliminar) en un menú "⋯" que
  aparece al hover de la fila, en el borde derecho. Eliminar necesita confirmación.
- **"+ Nuevo objetivo"** abre el formulario de alta (no existe todavía): tipo, título, métrica,
  valor objetivo y fecha límite. El `baseline_value` se toma automáticamente del estado actual de
  la cuenta al crear.
- **Orden por defecto**: mayor % primero (el más cerca de cerrarse arriba). Los COMPLETADO van al
  final, colapsados o en una sección aparte.

## Estados vacíos y borde

- **Sin objetivos**: estado vacío dentro del contenedor con el copy explicando para qué sirven y el
  botón "+ Nuevo objetivo" centrado. No dejes el contenedor vacío con solo la cabecera.
- **Objetivo sin datos suficientes** (menos de ~5 partidas): la columna de ritmo no puede calcular
  nada honesto. Mostrá "Faltan partidas" (Sans 500 12px `#787d88`) en vez de inventar un número.
- **Objetivo vencido sin cumplirse**: estado ATRASADO, la columna de ritmo pasa a "Venció el
  <fecha>" y la brecha queda en rojo.
- En pantallas angostas (< ~1100px) la grilla de 4 columnas no entra: colapsá a dos filas por
  objetivo — título + actual + barra arriba, brecha y ritmo abajo en una fila de dos columnas.

## Lo que NO cambia

El resto del panel queda igual. Esta vista reemplaza únicamente el contenido de la vista Objetivos
(`view: 'Objetivos'`). La tarjeta "OBJETIVO ACTIVO" de la columna derecha de la vista Cuentas
también debería mostrar la brecha y el ritmo en vez del porcentaje solo, por consistencia — pero
eso es un cambio aparte, decilo antes de tocarlo.
