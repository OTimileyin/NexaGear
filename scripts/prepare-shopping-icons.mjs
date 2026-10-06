import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const source = await readFile("mobile/src/components/shopping.tsx", "utf8");
const paths = [...source.matchAll(/^  (\w+): '([^']+)',/gm)];
await mkdir("mobile/assets/icons", { recursive: true });
for (const [, name, path] of paths) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  await writeFile(`mobile/assets/icons/${name}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`mobile/assets/icons/${name}.png`);
}
await writeFile("mobile/src/components/shopping-icons.ts", `// Native-safe raster versions of the adjacent SVG assets.\nexport const shoppingIcons = {\n${paths.map(([, name]) => `  ${name}: require("../../assets/icons/${name}.png"),`).join("\n")}\n} as const;\n`);
console.log(`Prepared ${paths.length} SVG icons and native-safe PNG equivalents.`);
