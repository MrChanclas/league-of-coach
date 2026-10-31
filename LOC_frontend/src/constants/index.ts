import type {
  AccountForm,
  BehaviorFlag,
  GoalStatus,
  GoalType,
  LessonCard,
  PoolEntryState,
  PoolRecommendationLabel,
  PoolRoleKey,
  PoolSlotKey,
  TabKey,
} from '../types/dashboard'
import type { CoachStep } from '../types/onboarding'
import type { AvailabilitySlot, DuoQueue } from '../types/social'
import type { MobileNavigationItem, NavigationItem, QueueFilter } from '../types/components'

export { queryKeys } from './queryKeys'

export const QUEUE_IDS = {
  SOLO: 420,
  FLEX: 440,
} as const

export const RANK_TIERS = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
] as const

// The home's "7 días" period; "Split" is the whole synced season.
export const HOME_RECENT_DAYS = 7
export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const BAR_SCALE_PX = 26
export const APP_VERSION = __APP_VERSION__
export const STATIC_PROOF = [
  { big: '20', label: 'PARTIDAS POR ANÁLISIS' },
  { big: '0$', label: 'DURANTE LA BETA' },
]

export const APEX_TIERS = new Set<string>(['MASTER', 'GRANDMASTER', 'CHALLENGER'])
export const RANK_DIVISIONS = ['IV', 'III', 'II', 'I'] as const
export const ROLE_KEYS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
export const PASSWORD_STRENGTH_BARS = 4
export const EMPTY_PASSWORD_STRENGTH = { filled: 0, label: 'DÉBIL', color: 'var(--hf-loss)' } as const
export const PASSWORD_STRENGTH_LEVELS = [
  { filled: 1, label: 'DÉBIL', color: 'var(--hf-loss)' },
  { filled: 2, label: 'DÉBIL', color: 'var(--hf-loss)' },
  { filled: 3, label: 'MEDIA', color: 'var(--hf-gold-strong)' },
  { filled: 4, label: 'SÓLIDA', color: 'var(--hf-win-green)' },
] as const

export const TYPE_TABS: { key: GoalType; label: string }[] = [
  { key: 'rango', label: 'Rango' },
  { key: 'rol', label: 'Rol' },
  { key: 'campeon', label: 'Campeón' },
]

export const TAB_KEYS: TabKey[] = ['cuentas', 'aprendizaje', 'objetivos', 'partidas', 'pool-champ', 'social']
export const DEFAULT_TAB: TabKey = 'cuentas'

export const BLANK_ACCOUNT_FORM: AccountForm = {
  summoner: '',
  tag: '',
  server: 'LAS',
}

// Each sync call only fetches as much history as Riot's rate limit allows, so
// a first sync of a full season needs several rounds. The cap is a safety net
// against an endless loop, not an expected stopping point: it covers far more
// games than a single season can hold.
export const MAX_SYNC_ROUNDS = 60
export const STATUS_MESSAGE_TIMEOUT_MS = 5000

export const NAV_ITEMS: NavigationItem[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas', tour: 'nav-partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje', tour: 'nav-aprendizaje' },
  { key: 'pool-champ', label: 'Pool Champ', tour: 'nav-pool-champ' },
  { key: 'objetivos', label: 'Objetivos', tour: 'nav-objetivos' },
  { key: 'social', label: 'Social' },
]

export const MOBILE_TAB_ITEMS: MobileNavigationItem[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas', tour: 'nav-partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje', tour: 'nav-aprendizaje' },
  { key: 'pool-champ', label: 'Pool', tour: 'nav-pool-champ' },
  { key: 'objetivos', label: 'Objetivos', tour: 'nav-objetivos' },
  { key: 'social', label: 'Social' },
]

export const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungla',
  MIDDLE: 'Medio',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
}

export const KIND_LABELS: Record<GoalType, string> = {
  rango: 'RANGO',
  rol: 'ROL',
  campeon: 'CAMPEÓN',
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  completed: 'COMPLETADO',
  in_progress: 'EN CURSO',
  behind: 'ATRASADO',
}

export const RANK_BAND_LABELS: Record<string, string> = {
  LOW: 'Hierro–Oro',
  MID: 'Platino–Diamante',
  HIGH: 'Maestro+',
}

// Official Spanish (LAS/LAN) tier names. The API keeps Riot's English keys;
// every place that shows a tier goes through formatTier/formatRank.
export const TIER_LABELS: Record<string, string> = {
  IRON: 'Hierro',
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Maestro',
  GRANDMASTER: 'Gran Maestro',
  CHALLENGER: 'Retador',
}

export const TIER_COLORS: Record<string, string> = {
  IRON: '#8a8578',
  BRONZE: '#a9784f',
  SILVER: '#9fb4bd',
  GOLD: '#cfa64c',
  PLATINUM: '#5fb6d8',
  EMERALD: '#4fd6b0',
  DIAMOND: '#7fa9f0',
  MASTER: '#b980e0',
  GRANDMASTER: '#e05a5a',
  CHALLENGER: '#f4e6a1',
}

export const LANE_LABELS: Record<string, string> = {
  TOP: 'TOP',
  JUNGLE: 'JNG',
  MIDDLE: 'MID',
  BOTTOM: 'ADC',
  UTILITY: 'SUP',
}

export const POOL_ROLE_KEYS: readonly PoolRoleKey[] = ROLE_KEYS
export const MIN_CHAMPIONS_PER_ROLE = 5
export const MAX_CHAMPIONS_PER_ROLE = 10

// Pool slot wording intentionally differs from the goal form's ROLE_LABELS.
export const POOL_ROLE_LABELS: Record<PoolRoleKey, string> = {
  TOP: 'Superior',
  JUNGLE: 'Jungla',
  MIDDLE: 'Medio',
  BOTTOM: 'Tirador',
  UTILITY: 'Soporte',
}

export const FILL_SLOT = 'FILL' as const

export const POOL_SLOT_LABELS: Record<PoolSlotKey, string> = {
  ...POOL_ROLE_LABELS,
  FILL: 'Fill',
}

export const POOL_STATE_LABELS: Record<PoolEntryState, string> = {
  main: 'MAIN',
  secondary: 'SECUNDARIO',
  testing: 'EN PRUEBA',
}

export const RECOMMENDATION_LABELS: Record<PoolRecommendationLabel, string> = {
  YA_TE_RINDE: 'YA TE RINDE',
  TU_ESTILO: 'TU ESTILO',
  CUBRE_HUECO: 'CUBRE HUECO',
}

export const PERFORMANCE_TIP_GOOD_MESSAGE = 'Sigue utilizándolo'
export const PERFORMANCE_TIP_BAD_MESSAGE = 'Necesitas mejorar'
export const POOL_MIN_GAMES_FOR_WINRATE = 3
export const POOL_PREVIEW_LIMIT = 6
export const POOL_SUGGESTED_LIMIT = 8
export const POOL_ROLE_FILTERS: ('ALL' | PoolRoleKey)[] = ['ALL', ...POOL_ROLE_KEYS]
export const POOL_PROMO_FAN_ROLES = ['TOP', 'JUNGLE', 'MIDDLE'] as const

// Display labels only; weights and benchmark formulas remain in the backend.
export const ROLE_METRIC_LABELS: Record<string, string[]> = {
  TOP: ['Solo Kills / Muertes', 'Ventaja de nivel vs. rival de línea', 'Torres botadas'],
  JUNGLE: ['Participación en kills', 'Participación en objetivos', 'Ventaja de CS en la jungla vs. jungla rival'],
  MIDDLE: ['Ventaja de CS vs. rival de línea', 'Participación en kills', '% de daño del equipo'],
  BOTTOM: ['CS/min', '% de daño del equipo', 'Muertes promedio'],
  UTILITY: ['Participación en kills', 'Visión/min', 'Control wards/min'],
}

export const LESSON_MEDIA_LABELS: Record<LessonCard['mediaType'], string> = {
  CLIP: 'clip de repetición',
  HEATMAP: 'mapa de calor',
  GOLD_GRAPH: 'gráfico de oro',
  MATCHUP_TABLE: 'tabla de matchups',
  SESSION_REPORT: 'gráfico de sesión',
}

export const ERROR_SEVERITY_LABELS: Record<BehaviorFlag['severity'], string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export const MATCH_QUEUE_LABELS: Record<number, string> = {
  [QUEUE_IDS.SOLO]: 'CLASIF. SOLO',
  [QUEUE_IDS.FLEX]: 'CLASIF. FLEXIBLE',
  400: 'NORMAL',
  430: 'NORMAL',
  450: 'ARAM',
}

export const MATCH_QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'Solo/dúo + Flexible' },
  { key: QUEUE_IDS.SOLO, label: 'Clasif. solo/dúo' },
  { key: QUEUE_IDS.FLEX, label: 'Flexible' },
]

export const CLAIMS = [
  'Tres correcciones concretas por semana, no cien estadísticas sueltas.',
  'Objetivos con progreso medible hasta el final del split.',
  'Múltiples cuentas en un solo panel: smurf, flex y principal.',
]

// Copy and anchors for the onboarding tour (see handoff_loc/04-onboarding.md).
export const COACH_STEPS: CoachStep[] = [
  {
    anchorSelector: '[data-tour="registrar-cuenta"]',
    tag: 'PASO 1 · TU CUENTA DE JUEGO',
    title: 'Todo arranca aquí',
    body: 'Registra tu Riot ID, servidor y rango actual. Puedes sumar hasta cinco cuentas y el panel las analiza por separado: tu principal, tu smurf y la de flex no se mezclan.',
    note: 'Mientras Riot no nos apruebe el acceso a su API, el rango se carga a mano. Cuando se apruebe, se rellena solo y no pierdes nada.',
    placement: 'right-start',
  },
  {
    anchorSelector: '[data-tour="sincronizar"]',
    tag: 'PASO 2 · CARGAR PARTIDAS',
    title: 'Sin partidas no hay análisis',
    body: 'Cada vez que termines una sesión, cárgala desde aquí. El indicador de la izquierda te dice si el panel está mirando datos frescos o viejos.',
    note: 'Con menos de cinco partidas no calculamos tendencias: preferimos no decir nada antes que decirte algo falso.',
    placement: 'bottom-end',
  },
  {
    anchorSelector: '[data-tour="hero"]',
    tag: 'PASO 3 · LEER EL PANEL',
    title: 'Tu semana en cinco números',
    body: 'Rango y progreso a la izquierda; a la derecha tu winrate y las cuatro métricas que más mueven la aguja: KDA, CS por minuto, racha y la línea que más juegas.',
    note: 'El verde significa que estás por encima de la media de tu elo. El azul es victoria, el rojo derrota. El dorado nunca es «bueno»: es «accionable».',
    missingAnchorNote: 'Este panel aparece en cuanto registras tu primera cuenta.',
    placement: 'bottom-start',
  },
  {
    anchorSelector: '[data-tour="nav-partidas"]',
    tag: 'PASO 4 · REVISAR TU HISTORIAL',
    title: 'Mira qué jugaste antes de sacar conclusiones',
    body: 'Antes de armar tu pool o mirar lecciones, repasa qué campeones jugaste, en qué líneas y qué partidas ganaste o perdiste. Es la base de todo lo que viene después.',
    note: null,
    placement: 'right-start',
  },
  {
    anchorSelector: '[data-tour="nav-pool-champ"]',
    tag: 'PASO 5 · POOL CHAMP',
    title: 'Declara qué campeones juegas de verdad',
    body: 'Arma tu pool por posición —entre cinco y diez campeones por rol— o toma la sugerencia del coach. Con eso dejamos de promediar todos tus campeones y afinamos las lecciones sobre los que realmente juegas.',
    note: 'Puedes dejar roles sin tocar: se completan más adelante, cuando quieras.',
    placement: 'right-start',
  },
  {
    anchorSelector: '[data-tour="nav-aprendizaje"]',
    tag: 'PASO 6 · APRENDIZAJE',
    title: 'Tres cosas para arreglar, no cien datos',
    body: 'Se desbloquea en cuanto tienes un pool armado. Leemos tus últimas partidas y las convertimos en lecciones concretas — y cuando detectamos un error, puedes convertirlo directamente en un objetivo para seguirlo.',
    note: 'Las lecciones se recalculan con cada carga. Si arreglas algo, deja de aparecer.',
    placement: 'right-start',
  },
  {
    anchorSelector: '[data-tour="nav-objetivos"]',
    tag: 'PASO 7 · OBJETIVOS',
    title: 'Cuánto falta y a qué ritmo',
    body: 'Se desbloquea junto con Aprendizaje, en cuanto tienes un pool armado. Fija una meta y el panel te dice la brecha que queda y qué tienes que hacer para cerrarla: «cuatro victorias seguidas», «ocho LP por día». Sin porcentajes que no significan nada.',
    note: 'Si el ritmo necesario supera lo que veníamos viendo en tus partidas, el objetivo se marca ATRASADO solo.',
    placement: 'right-start',
  },
]

export const LAST_COACH_STEP = COACH_STEPS.length
export const DONE_STEP = LAST_COACH_STEP + 1

export const WELCOME_STEPS = [
  { n: '1', title: 'Registras tus cuentas', body: 'Hasta cinco. Cada una se analiza por separado.' },
  { n: '2', title: 'Cargas tus partidas', body: 'Una sesión alcanza para que el panel arranque.' },
  { n: '3', title: 'Recibes tres correcciones', body: 'Con el dato que las respalda y cómo revisarlas.' },
]

export const CHECKLIST_TASKS = [
  { name: 'Registrar tu cuenta de juego', hint: 'Riot ID, servidor y rango actual.' },
  { name: 'Cargar tus primeras partidas', hint: 'Con una sesión ya alcanza para empezar.' },
  { name: 'Armar tu pool de campeones', hint: 'Mínimo cinco por rol, o toma la del coach.' },
  { name: 'Leer tu primera lección', hint: 'Se desbloquean cuando armas tu pool.' },
  { name: 'Fijar un objetivo del split', hint: 'Rango, winrate o un hábito.' },
] as const

// ─── Social (duo finder, duos and chat) ─────────────────────────────────

// Polling instead of a socket: the backend runs on several Cloud Run
// instances, so a push from one wouldn't reach clients on another. The open
// chat polls fast; badges and lists can lag a little.
export const CHAT_POLL_MS = 3_000
export const DUO_LIST_POLL_MS = 15_000
export const SOCIAL_SUMMARY_POLL_MS = 30_000

// Same limits the backend validates (social.schemas.ts).
export const DUO_NOTE_MAX = 200
export const DUO_REQUEST_MESSAGE_MAX = 300
export const DUO_MESSAGE_MAX = 1000
export const DUO_REPORT_REASON_MAX = 500

export const DUO_QUEUE_LABELS: Record<DuoQueue, string> = {
  solo: 'Solo/Dúo',
  flex: 'Flexible',
}

export const AVAILABILITY_SLOTS: AvailabilitySlot[] = ['manana', 'tarde', 'noche', 'madrugada']
export const AVAILABILITY_LABELS: Record<AvailabilitySlot, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
  madrugada: 'Madrugada',
}

// Duo goals stop at Master: from Grandmaster on, Riot doesn't allow duo.
export const DUO_GOAL_TIERS = RANK_TIERS.slice(0, RANK_TIERS.indexOf('MASTER') + 1)
