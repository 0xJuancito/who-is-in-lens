import { example } from "../src"
import expect from "expect"

describe("unit", () => {
  it("smoke test", () => {
    expect(example()).toEqual(true)
  })
})
