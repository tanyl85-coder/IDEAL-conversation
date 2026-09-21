import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scenarios } from "../lib/scenarios.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs", "data");

await mkdir(output, { recursive: true });

const framework = JSON.parse(await readFile(path.join(root, "lib", "framework.json"), "utf8"));
await Promise.all([
  writeFile(path.join(output, "framework.json"), `${JSON.stringify(framework, null, 2)}\n`),
  writeFile(path.join(output, "scenarios.json"), `${JSON.stringify(scenarios, null, 2)}\n`),
]);

console.log(`Exported ${framework.attributes.length} attributes and ${scenarios.length} scenarios.`);
