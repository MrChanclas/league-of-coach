/**
 * Pausa de `ms` milisegundos. Vive en common porque la usan tanto los
 * reintentos de descarga de partidas como las re-consultas a la lista de
 * Riot, que antes tenían cada una su propia copia.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
