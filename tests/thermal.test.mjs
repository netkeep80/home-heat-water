import test from "node:test";
import assert from "node:assert/strict";
import { storedHeatKWh, nightInputKWh, idealChargeHours, tankScenarios } from "../src/thermal.ts";

test("water storage estimates at delta T=40 K", () => {
  assert.ok(Math.abs(storedHeatKWh(550, 40) - 25.58) < 0.05);
  assert.ok(Math.abs(storedHeatKWh(600, 40) - 27.91) < 0.05);
  assert.ok(Math.abs(storedHeatKWh(800, 40) - 37.21) < 0.05);
});
test("the night window is an input ceiling, not net storage", () => {
  assert.equal(nightInputKWh(4, 8), 32);
  assert.ok(idealChargeHours(storedHeatKWh(600, 40), 4) < 8);
  assert.ok(idealChargeHours(storedHeatKWh(800, 40), 4) > 8);
});
test("scenarios are monotone with volume", () => {
  const cases = tankScenarios([550,600,800],40,4);
  assert.deepEqual(cases.map(item=>item.volumeLitres), [550,600,800]);
  assert.ok(cases[0].storedKWh < cases[1].storedKWh && cases[1].storedKWh < cases[2].storedKWh);
});
test("rejects invalid inputs", () => {
  assert.throws(()=>storedHeatKWh(-1,40), RangeError);
  assert.throws(()=>storedHeatKWh(500, Number.NaN), RangeError);
  assert.throws(()=>nightInputKWh(Number.POSITIVE_INFINITY,8), RangeError);
  assert.throws(()=>idealChargeHours(5,0), RangeError);
});
