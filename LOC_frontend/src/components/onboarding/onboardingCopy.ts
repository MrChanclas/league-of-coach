// Copy y anclas del recorrido de onboarding — ver handoff_loc/04-onboarding.md.
// Todo el texto va en español neutro (tú), tono de coach directo.

export type CoachStep = {
  anchorSelector: string
  tag: string
  title: string
  body: string
  note: string | null
  placement: 'right-start' | 'bottom-start' | 'bottom-end'
}

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
    placement: 'bottom-start',
  },
  {
    anchorSelector: '[data-tour="nav-aprendizaje"]',
    tag: 'PASO 4 · APRENDIZAJE',
    title: 'Tres cosas para arreglar, no cien datos',
    body: 'Aquí está el corazón de LoC. Leemos tus últimas partidas y las convertimos en lecciones concretas, cada una con el dato que la respalda y el material para revisarla.',
    note: 'Las lecciones se recalculan con cada carga. Si arreglas algo, deja de aparecer.',
    placement: 'right-start',
  },
  {
    anchorSelector: '[data-tour="nav-objetivos"]',
    tag: 'PASO 5 · OBJETIVOS',
    title: 'Cuánto falta y a qué ritmo',
    body: 'Fija una meta y el panel te dice la brecha que queda y qué tienes que hacer para cerrarla: «cuatro victorias seguidas», «ocho LP por día». Sin porcentajes que no significan nada.',
    note: 'Si el ritmo necesario supera lo que veníamos viendo en tus partidas, el objetivo se marca ATRASADO solo.',
    placement: 'right-start',
  },
]

export const WELCOME_STEPS = [
  { n: '1', title: 'Registras tus cuentas', body: 'Hasta cinco. Cada una se analiza por separado.' },
  { n: '2', title: 'Cargas tus partidas', body: 'Una sesión alcanza para que el panel arranque.' },
  { n: '3', title: 'Recibes tres correcciones', body: 'Con el dato que las respalda y cómo revisarlas.' },
]

export const CHECKLIST_TASKS = [
  { name: 'Registrar tu cuenta de juego', hint: 'Riot ID, servidor y rango actual.' },
  { name: 'Cargar tus primeras partidas', hint: 'Con una sesión ya alcanza para empezar.' },
  { name: 'Leer tu primera lección', hint: 'Aparecen solas cuando hay datos.' },
  { name: 'Fijar un objetivo del split', hint: 'Rango, winrate o un hábito.' },
] as const
