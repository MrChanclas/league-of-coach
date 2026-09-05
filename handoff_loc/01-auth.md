# 01 — Login / Registro

Archivo de referencia: `design/LoC Auth.dc.html`.
Tokens, marca y responsive: ver `README.md`.

## Overview

Un solo layout de dos columnas cubre tres pasos:

1. **Iniciar sesión** — email/contraseña + Google y Discord.
2. **Crear cuenta** — mismos providers + formulario de email.
3. **Registrar cuenta de juego** — el usuario anota su Riot ID, servidor y rango **a mano**.

En el prototipo los tres son `<sc-if>` hermanos sobre `state.mode`. En producción son rutas.

## Integración con Clerk

Clerk maneja los pasos 1 y 2. El paso 3 es **tuyo** — no es parte de Clerk.

### Camino A: componentes de Clerk con `appearance` (recomendado para empezar)

`<SignIn />` / `<SignUp />` estilados vía `appearance`. Mapeo de los tokens de este diseño:

```js
appearance: {
  variables: {
    colorBackground: '#0e1116',
    colorPrimary: '#c2a05a',
    colorText: '#e8e4da',
    colorTextSecondary: '#868b96',
    colorInputBackground: '#0e1116',
    colorInputText: '#e8e4da',
    colorDanger: '#cd6a63',
    colorSuccess: '#5fceac',
    borderRadius: '9px',
    fontFamily: "'IBM Plex Sans', sans-serif"
  },
  elements: {
    card: 'bg-transparent shadow-none border-none',   // el shell lo aporta tu layout
    headerTitle: "font-['Chakra_Petch'] text-[30px] font-bold text-[#f3ece0]",
    headerSubtitle: 'text-[13px] text-[#868b96]',
    formFieldLabel: "font-['IBM_Plex_Mono'] text-[9.5px] font-semibold tracking-[.18em] uppercase text-[#787d88]",
    formFieldInput: 'bg-[#0e1116] border-white/[.09] rounded-[9px] px-[15px] py-[13px] text-[13.5px] focus:border-[#d8b56a]/55 focus:bg-[#101419]',
    formButtonPrimary: 'bg-gradient-to-b from-[#e0c07a] to-[#c2a05a] text-[#141109] text-[13.5px] font-semibold shadow-[0_2px_14px_rgba(216,181,106,.22)] hover:brightness-[1.06]',
    socialButtonsBlockButton: 'border-white/10 bg-white/[.03] text-[#dcd7cb] hover:border-[#d8b56a]/40 hover:bg-[#d8b56a]/[.06]',
    dividerLine: 'bg-white/[.08]',
    dividerText: "font-['IBM_Plex_Mono'] text-[9.5px] tracking-[.16em] text-[#5c616b] uppercase",
    footerActionLink: 'text-[#c8a862] hover:text-[#e2c483]'
  }
}
```

Nota: los labels de este diseño son **mono, mayúsculas y con mucho letter-spacing**. No salen así
por defecto — hay que forzarlos por `elements`, como arriba.

### Camino B: headless (`useSignIn` / `useSignUp`)

Necesario si querés exactamente el markup del prototipo. Más control, más trabajo: manejás vos los
errores por campo, el flujo de verificación de email y los `authenticateWithRedirect` de los social
providers.

### El paso 3

Implementalo como onboarding posterior al signup:

- Guardalo en tu propia tabla `game_accounts` con FK al `clerk_user_id` (mejor que
  `publicMetadata`, porque después vas a guardar partidas ahí).
- **Protegé la ruta del panel**: si el usuario no tiene ninguna cuenta de juego registrada,
  redirigí al paso 3 en vez de al dashboard.

```
game_accounts
  id
  clerk_user_id     FK
  riot_name
  riot_tag
  region            LAS | LAN | NA | EUW | BR
  tier              IRON … MASTER+
  division
  lp                int
  source            'manual' | 'riot_api'
  created_at
```
Varias filas por usuario — hasta 5 cuentas, según el copy del panel.

## Layout

`display:grid; grid-template-columns: minmax(0,1fr) 560px`. Fondo de página `#07080b`.

```
┌───────────────────────────────┬──────────────────────┐
│ panel de marca (fluido)       │ panel de formulario  │
│ padding 44px 56px 40px        │ 560px, padding 40 56 │
└───────────────────────────────┴──────────────────────┘
```

### Panel izquierdo (marca)

Fondo `linear-gradient(150deg,#12161d 0%,#0d1116 48%,#151018 100%)`, borde derecho
`1px solid rgba(255,255,255,.06)`, `overflow:hidden`,
`display:flex; flex-direction:column; justify-content:space-between`.

Tres capas decorativas absolutas, todas con `pointer-events:none`:
1. Brillo: `inset:0`, `radial-gradient(760px 320px at 18% -12%, rgba(216,181,106,.15), transparent 70%)`.
2. Rombo grande: `top:150px; right:-70px; 340×340; rotate(45deg); border-radius:44px;` borde
   `1px solid rgba(216,181,106,.1)`.
3. Rombo flotante: `top:250px; right:10px; 180×180; border-radius:26px;` borde
   `1px solid rgba(216,181,106,.16)`, fondo
   `linear-gradient(160deg,rgba(216,181,106,.07),transparent)`,
   `animation: loc-drift 9s ease-in-out infinite`.

**Arriba** — lockup de marca: icono a 32px + eyebrow/wordmark (ver README).

**Centro** — pitch (`max-width: 34ch`):
- Eyebrow "TEMPORADA 15 · SPLIT 3" (Mono 600 9.5px, ls .24em, `#b99b58`).
- H1 "Deja de adivinar por qué pierdes." (Chakra Petch 700 46px/1.08 `#f3ece0`, `text-wrap:pretty`).
- Párrafo (Sans 400 14.5px/1.6 `#868b96`, `text-wrap:pretty`): vinculás tus cuentas una vez, LoC
  analiza cada partida y devuelve tres cosas concretas para arreglar esta semana.
- 3 claims (flex column, gap 13px): rombo de 6px `#c2a05a` (margin-top 7px) + texto
  Sans 400 13px/1.5 `#9aa0ac`.
  1. "Tres correcciones concretas por semana, no cien estadísticas sueltas."
  2. "Objetivos con progreso medible hasta el final del split."
  3. "Múltiples cuentas en un solo panel: smurf, flex y principal."

**Abajo** — prueba social (padding-top 26px, borde superior `1px solid rgba(255,255,255,.07)`,
gap 30px): tres pares valor/label — valor Mono 600 20px `#e0dbcf`, label Mono 400 9.5px ls .16em
`#6f747f` (margin-top 7px): `3` CUENTAS POR PERFIL · `20` PARTIDAS POR ANÁLISIS · `0$` DURANTE LA
BETA.
A la derecha (con `flex:1` spacer antes): punto de 6px `#c2a05a` con
`box-shadow: 0 0 8px rgba(216,181,106,.6)` y `animation: loc-pulse 2.4s ease-in-out infinite`, más
"BETA CERRADA · CARGA MANUAL" (Mono 400 10.5px `#787d88`).

### Panel derecho (formulario)

Fondo `#0a0c10`, `display:flex; flex-direction:column`.

**Cabecera** (space-between):
- **Tabs** (`padding:4px; radius:9px;` fondo `#0e1116`, borde `1px solid rgba(255,255,255,.07)`,
  gap 4px). Cada tab `padding:9px 18px; radius:7px;` Sans 600 12.5px.
  Activa: texto `#f3e8d1`, fondo
  `linear-gradient(90deg,rgba(216,181,106,.16),rgba(216,181,106,.05))`, borde
  `1px solid rgba(216,181,106,.3)`. Inactiva: texto `#868b96`, fondo y borde transparentes.
  **"Crear cuenta" queda activa también durante el paso 3.**
- "LAS · ESPAÑOL" (Mono 400 10.5px `#5c616b`). Es un indicador, no un selector — si agregás
  selector de idioma, va acá.

**Pie** (con un `flex:1` spacer antes, padding-top 26px, Mono 400 10.5px `#5c616b`):
"LEAGUE OF COACHING · NO AFILIADO A RIOT GAMES" a la izquierda; links Privacidad / Términos a la
derecha (gap 16px).

## Componentes base

Estos los reutiliza el dashboard. Construilos primero.

**Input** — `width:100%; box-sizing:border-box; padding:13px 15px; border-radius:9px;`
fondo `#0e1116`, borde `1px solid rgba(255,255,255,.09)`, Sans 400 13.5px `#e8e4da`.
Focus: borde `rgba(216,181,106,.55)`, fondo `#101419`. Placeholder `#5c616b`.
Los de contraseña llevan `letter-spacing:.1em`; los de tag y LP usan IBM Plex Mono 500.

**Label de campo** — Mono 600 9.5px, ls .18em, `#787d88`, mayúsculas. `gap:9px` con el input.

**Botón primario** — `padding:13px 14px; radius:9px;` fondo
`linear-gradient(180deg,#e0c07a,#c2a05a)`, texto `#141109` Sans 600 13.5px, centrado,
`box-shadow: 0 2px 14px rgba(216,181,106,.22)`. Hover `filter: brightness(1.06)`.
Deshabilitado: fondo `rgba(255,255,255,.04)`, texto `#5c616b`, borde
`1px solid rgba(255,255,255,.08)`, `cursor:not-allowed`, sin sombra.

**Botón social** — `padding:12px 14px; radius:9px;` borde `1px solid rgba(255,255,255,.11)`,
fondo `rgba(255,255,255,.03)`, contenido centrado gap 11px; label Sans 600 13px `#dcd7cb`.
Hover: borde `rgba(216,181,106,.4)`, fondo `rgba(216,181,106,.06)`.
La marca del provider es un **rombo de 16px radius 3px** en el prototipo — Google
`linear-gradient(145deg,#e8e4da,#9aa0ac)`, Discord `linear-gradient(145deg,#8b9bf0,#4a56a8)`.
**Sustituir por los SVG de marca reales** (o usar los que trae Clerk).

**Botón fantasma / "+ acción"** — `padding:11px; radius:9px;` borde
`1px dashed rgba(216,181,106,.28)`, texto Sans 500 12px `#b99b58`, centrado.
Hover: fondo `rgba(216,181,106,.07)`, borde `rgba(216,181,106,.5)`.

**Checkbox** — caja 17×17 radius 4px, `display:grid; place-items:center`.
Marcado: borde `rgba(216,181,106,.6)`, fondo = acento, glifo "✓" Mono 600 10px `#141109`.
Sin marcar: borde `rgba(255,255,255,.14)`, fondo transparente.
Toda la fila (caja + texto) es clicable.

**Chip de selección** — `border-radius:20px;` Mono 500 11.5px ls .08em.
Padding `8px 15px` (servidor) o `7px 12px` (rango).
Activo: texto `#f3e8d1`, fondo `rgba(216,181,106,.12)`, borde `1px solid rgba(216,181,106,.45)`.
Inactivo: texto `#9aa0ac`, fondo `rgba(255,255,255,.03)`, borde `1px solid rgba(255,255,255,.08)`.

**Separador** — dos líneas `flex:1` de 1px `rgba(255,255,255,.08)` con el texto en medio
(Mono 400 9.5px, ls .16em, `#5c616b`), gap 14px. Texto: "O CON TU CORREO".

**Chip de paso (stepper)** — `padding:6px 11px; radius:20px;` Mono 600 9px ls .14em.
Actual: texto `#f3e8d1`, fondo `rgba(216,181,106,.14)`, borde `rgba(216,181,106,.4)`.
Completado: texto `#5fceac`, fondo `rgba(63,174,143,.1)`, borde `rgba(63,174,143,.3)`.
Pendiente: texto `#5c616b`, transparente, borde `rgba(255,255,255,.08)`.
Etiquetas: "1 · CUENTA", "2 · PERFIL DE JUEGO", "3 · PRIMER ANÁLISIS".
El paso 3 nunca se marca activo acá — se alcanza ya dentro del panel.

**Nota al pie de sección** — padding-top 22px, borde superior `1px solid rgba(255,255,255,.07)`,
texto Sans 400 12.5px/1.6 `#787d88` con links inline `#c8a862` weight 500.
En login y registro incluye a la derecha un sello "SEGURO CON CLERK": rombo de 5px `#5c616b` +
Mono 400 9.5px ls .14em `#5c616b`.

## Los tres pasos

### 1. Iniciar sesión — `mode: 'login'` (inicial)

`margin-top: 48px`. Orden vertical:
1. Eyebrow "BIENVENIDO DE VUELTA" (Mono 600 9.5px ls .24em `#b99b58`).
2. H2 "Entrá a tu panel" (Chakra Petch 700 30px/1.15 `#f3ece0`, margin-top 13px).
3. Sub "Tus cuentas y el análisis del split te esperan donde los dejaste."
   (Sans 400 13px/1.5 `#868b96`, margin-top 9px).
4. Dos botones sociales (gap 11px, margin-top 30px): "Continuar con Google",
   "Continuar con Discord".
5. Separador (margin 20px 0).
6. Campos (gap 17px): CORREO; CONTRASEÑA con "¿La olvidaste?" alineado a la derecha del label
   (Sans 500 11px, color de link).
7. Checkbox "Mantener la sesión abierta en este equipo" — default **marcado**.
8. Botón primario "Entrar".
9. Nota al pie: "¿Primera vez acá? **Creá tu cuenta gratis**" + sello de Clerk.

### 2. Crear cuenta — `mode: 'register'`

`margin-top: 40px`. Stepper en paso 1.
1. Stepper (gap 9px).
2. H2 "Creá tu cuenta" (margin-top 22px) + sub "Sin tarjeta. Durante la beta el análisis se genera
   con los datos que cargues vos."
3. Dos botones sociales con label de signup ("Registrarme con Google" / "…con Discord").
4. Separador (margin 18px 0).
5. Campos (gap 16px):
   - CÓMO TE LLAMAMOS (placeholder "Tu nombre o apodo").
   - CORREO.
   - CONTRASEÑA (placeholder "Mínimo 10 caracteres") con **medidor de fuerza** debajo: 4 segmentos
     `flex:1` de 3px radius 3px, los llenos en el color del nivel, los vacíos
     `rgba(255,255,255,.09)`, más la etiqueta (Mono 500 10px ls .1em) al lado.
     En el prototipo está fijo en 3/4 "SÓLIDA" — al implementar, calculalo (`zxcvbn` o las reglas
     de Clerk) con escala DÉBIL `#cd6a63` → MEDIA `#e2c483` → SÓLIDA `#5fceac`.
6. Checkbox de términos, texto largo (`align-items:flex-start`, `max-width:44ch`), default
   **marcado**. Menciona explícitamente que LoC no es un producto oficial de Riot Games.
7. Botón "Continuar" — **deshabilitado si los términos están sin marcar**. Es la única validación
   implementada en el prototipo.
8. Nota al pie: "¿Ya tenés cuenta? **Entrá acá**" + sello de Clerk.

### 3. Registrar cuenta de juego — `mode: 'riot'`

`margin-top: 40px`. Stepper en paso 2, con el paso 1 marcado como completado (verde).

1. Stepper.
2. H2 "Registrá tu cuenta de juego" (margin-top 22px) + sub "Anotá tu Riot ID para identificar el
   perfil. La sincronía automática llega cuando Riot apruebe el acceso."
3. **Aviso de beta** — `radius:11px`, borde `1px solid rgba(216,181,106,.24)`, fondo
   `linear-gradient(160deg,rgba(216,181,106,.08),rgba(14,17,22,.6))`, `padding:14px 16px`, flex
   `align-items:flex-start` gap 12px. Rombo de 7px `#c2a05a` (margin-top 5px); título "Beta sin
   sincronía automática" (Sans 600 11.5px `#e2c483`); cuerpo (Sans 400 12px/1.55 `#8d919c`,
   margin-top 6px, `max-width:46ch`) explicando que no hay clave de producción, que por ahora se
   carga a mano, y que **nada se pierde** cuando se apruebe el acceso.
   → Este bloque es el que evita tickets de soporte. No lo escondas ni lo suavices.
4. **RIOT ID** — `grid-template-columns: minmax(0,1fr) 132px; gap:9px`: nombre de invocador (Sans)
   + "#TAG" (Mono 500).
5. **SERVIDOR** — chips LAS / LAN / NA / EUW / BR. Default **LAS**.
6. **RANGO ACTUAL · SOLO/DÚO** — `grid-template-columns: minmax(0,1fr) 116px; gap:9px;
   align-items:end`: chips IRON / BRONZE / SILVER / GOLD / PLATINUM / EMERALD / DIAMOND / MASTER+
   (default **EMERALD**) y a la derecha un input de LP (`padding:11px 14px; radius:8px`,
   Mono 500 12.5px, placeholder "75 LP").
   → Falta el selector de **división** (I–IV). Agregalo, o derivalo de un input combinado.
7. **Tarjeta de previsualización** — `radius:11px`, borde `1px solid rgba(255,255,255,.08)`, fondo
   `#0e1116`, `padding:15px 16px`, flex gap 13px. Avatar 44×44 radius 10px rayado con iniciales;
   nombre (Chakra Petch 700 15px `#f0e9dd`) + tag (Mono 500 10.5px `#787d88`); segunda línea
   Mono 400 11px `#6f747f` con `NIVEL — · <SERVIDOR> · <RANGO> · CARGADO A MANO` (**se actualiza en
   vivo** con los chips); badge **MANUAL** a la derecha (`padding:4px 9px; radius:20px;` fondo
   `rgba(216,181,106,.12)`, borde `1px solid rgba(216,181,106,.35)`, Mono 600 8.5px ls .14em
   `#e2c483`).
   → Con la API, el badge pasa a **ENCONTRADA** en verde (fondo `rgba(63,174,143,.14)`, borde
   `rgba(63,174,143,.35)`, texto `#5fceac`) y la línea de meta se rellena con nivel y rango reales.
8. Botón primario "Guardar cuenta y entrar al panel" + fantasma "+ Registrar otra cuenta" (gap 11px).
9. Pie: "Te avisamos por correo cuando la sincronía automática esté lista." y a la derecha
   "Lo haré más tarde →" (Sans 500 12px `#787d88`, hover `#c8a862`).
   → En el prototipo vuelve al login. **En producción debe llevar al panel en estado vacío.**

## Interactions & Behavior

- Las tabs cambian entre login y registro. El paso 3 se alcanza con "Continuar" desde registro y
  mantiene "Crear cuenta" como tab activa.
- Los links de las notas al pie cruzan entre login y registro.
- Checkboxes: toda la fila es clicable. "Recordarme" y términos arrancan marcados.
- "Continuar" deshabilitado sin aceptar términos.
- Los chips de servidor y rango son selección única y actualizan la línea de meta de la tarjeta de
  previsualización en vivo.
- Hovers definidos: botón primario (brillo), botones sociales y fantasma (borde y fondo dorados),
  inputs en focus (borde dorado), "Lo haré más tarde" (color).

## State

```js
state = {
  mode: 'login',      // 'login' | 'register' | 'riot'
  remember: true,
  terms: true,
  region: 'LAS',      // LAS | LAN | NA | EUW | BR
  tier: 'EMERALD'     // IRON … MASTER+
}
```

En producción: `mode` sale del routing (`/sign-in`, `/sign-up`, `/onboarding/cuenta`), no del estado
local. `remember` lo maneja Clerk. `terms`, `region` y `tier` son estado de formulario — usá el form
library del proyecto.

Prop tweakable del prototipo: `accent` (default `#d8b56a`) — afecta el relleno de los checkboxes
marcados. En producción es un token de tema, no un control.
