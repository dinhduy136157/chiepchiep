export type LearnQueueCard = {
  id: number
}

export function normalizeLearnAnswer(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function isLearnAnswerCorrect(input: string, term: string) {
  return normalizeLearnAnswer(input) === normalizeLearnAnswer(term)
}

export function moveCardToEnd<T extends LearnQueueCard>(cards: T[], currentIndex: number) {
  const currentCard = cards[currentIndex]
  if (!currentCard) return cards

  return [
    ...cards.slice(0, currentIndex),
    ...cards.slice(currentIndex + 1),
    currentCard,
  ]
}
