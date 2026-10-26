import { tankScenarios, nightInputKWh } from "../src/thermal.ts";
const kwh = (v) => v.toFixed(2);
console.log("Approximate 40 K thermal storage (1 kg/L, cp=4.186 kJ/kg/K):");
for (const s of tankScenarios([550,600,800],40,4)) {
  console.log(`${s.volumeLitres} L: ${kwh(s.storedKWh)} kWh, ideal ${kwh(s.idealChargeHours)} h at 4 kW`);
}
console.log(`Max input during 23:00–07:00 at 4 kW: ${nightInputKWh(4,8)} kWh`);
console.log("Actual useful storage is lower when space heating/DHW draws heat concurrently.");
