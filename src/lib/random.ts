/** Determinístico a partir de uma string — mantém dado mockado estável entre
 * re-renders/HMR em vez de resortear a cada reload. */
export function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const x = Math.sin(hash) * 10000
  return x - Math.floor(x)
}
