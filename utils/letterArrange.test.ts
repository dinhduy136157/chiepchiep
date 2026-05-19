import assert from "node:assert/strict"
import test from "node:test"

import {
  buildLetterTiles,
  checkArrangedAnswer,
  getArrangedAnswer,
  shuffleLetterTiles,
} from "./letterArrange.js"

test("buildLetterTiles keeps every visible character from the term", () => {
  const tiles = buildLetterTiles("Hello world")

  assert.equal(tiles.length, 10)
  assert.equal(tiles.map((tile) => tile.value.toLocaleLowerCase()).sort().join(""), "dehllloorw")
  assert.equal(new Set(tiles.map((tile) => tile.id)).size, tiles.length)
})

test("checkArrangedAnswer accepts the arranged term regardless of case or extra spaces", () => {
  const arranged = "hello world"
    .replace(/\s/g, "")
    .split("")
    .map((value, index) => ({ id: `answer-${index}`, value }))

  assert.equal(getArrangedAnswer(arranged), "helloworld")
  assert.equal(checkArrangedAnswer(arranged, "  HELLO   WORLD "), true)
})

test("checkArrangedAnswer rejects incomplete arrangements", () => {
  const tiles = buildLetterTiles("Quiz")

  assert.equal(checkArrangedAnswer(tiles.slice(0, 3), "Quiz"), false)
})

test("shuffleLetterTiles returns a new tile order without mutating the original", () => {
  const tiles = buildLetterTiles("ABCD")
  const shuffled = shuffleLetterTiles(tiles, () => 0)

  assert.deepEqual(tiles.map((tile) => tile.value), ["A", "B", "C", "D"])
  assert.deepEqual(shuffled.map((tile) => tile.value), ["B", "C", "D", "A"])
})
