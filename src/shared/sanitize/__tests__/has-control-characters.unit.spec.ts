import { hasControlCharacters } from "../has-control-characters"

const SINGLE_LINE = { multiline: false }
const MULTILINE = { multiline: true }

describe("hasControlCharacters", () => {
  it("finds every control character in a text of one line", () => {
    for (let code = 0; code <= 0x1f; code++) {
      expect(
        hasControlCharacters(`a${String.fromCharCode(code)}b`, SINGLE_LINE)
      ).toBe(true)
    }

    expect(hasControlCharacters("a\u007fb", SINGLE_LINE)).toBe(true)
  })

  it("allows tab, line feed and carriage return in a text of several lines only", () => {
    for (const lineBreak of ["\t", "\n", "\r"]) {
      expect(hasControlCharacters(`a${lineBreak}b`, MULTILINE)).toBe(false)
      expect(hasControlCharacters(`a${lineBreak}b`, SINGLE_LINE)).toBe(true)
    }
  })

  it("finds the other control characters in a text of several lines", () => {
    for (const character of [
      "\u0000",
      "\u000b",
      "\u000c",
      "\u001b",
      "\u007f",
    ]) {
      expect(hasControlCharacters(`a${character}b`, MULTILINE)).toBe(true)
    }
  })

  it("finds nothing in plain, accented and symbol text", () => {
    for (const text of [
      "",
      "Soup",
      "Zażółć gęślą jaźń",
      "a < b & c > d",
      "€ – ✓ 😀",
    ]) {
      expect(hasControlCharacters(text, SINGLE_LINE)).toBe(false)
    }
  })
})
