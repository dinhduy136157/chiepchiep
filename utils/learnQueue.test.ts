import assert from "node:assert/strict"
import test from "node:test"

import {
  isLearnAnswerCorrect,
  moveCardToEnd,
  normalizeLearnAnswer,
} from "./learnQueue.ts"

test("normalizeLearnAnswer ignores surrounding whitespace and case", () => {
  assert.equal(normalizeLearnAnswer("  Hello World "), "hello world")
})

test("isLearnAnswerCorrect accepts the typed term only after normalization", () => {
  assert.equal(isLearnAnswerCorrect("  APPLE ", "apple"), true)
  assert.equal(isLearnAnswerCorrect("aple", "apple"), false)
})

test("moveCardToEnd sends a missed card behind the remaining questions", () => {
  const cards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  assert.deepEqual(moveCardToEnd(cards, 1).map((card) => card.id), [1, 3, 4, 2])
  assert.deepEqual(cards.map((card) => card.id), [1, 2, 3, 4])
})

test("moveCardToEnd keeps the queue stable when there is no later question", () => {
  const cards = [{ id: 1 }, { id: 2 }]

  assert.deepEqual(moveCardToEnd(cards, 1).map((card) => card.id), [1, 2])
})
