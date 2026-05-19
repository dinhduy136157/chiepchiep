export type LetterTile = {
  id: string
  value: string
}

export function normalizeArrangedAnswer(value: string) {
  return value.replace(/\s/g, "").toLocaleLowerCase()
}

export function buildLetterTiles(term: string): LetterTile[] {
  return Array.from(term.replace(/\s/g, "")).map((value, index) => ({
    id: `${value}-${index}`,
    value,
  }))
}

export function getArrangedAnswer(tiles: LetterTile[]) {
  return tiles.map((tile) => tile.value).join("")
}

export function checkArrangedAnswer(tiles: LetterTile[], term: string) {
  return normalizeArrangedAnswer(getArrangedAnswer(tiles)) === normalizeArrangedAnswer(term)
}

export function shuffleLetterTiles(
  tiles: LetterTile[],
  random: () => number = Math.random
) {
  const shuffled = [...tiles]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}
