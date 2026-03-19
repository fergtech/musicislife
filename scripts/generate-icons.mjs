/**
 * Generates placeholder PWA icons as SVG files that can be converted to PNG.
 * Run: node scripts/generate-icons.mjs
 *
 * For production, replace the generated PNGs with your real artwork.
 * Tools to convert SVG → PNG: Inkscape, Sharp, or squoosh.app
 */

import fs from "fs";
import path from "path";

const ICONS_DIR = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(ICONS_DIR, { recursive: true });

function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0a0a0a"/>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#a855f7" opacity="0.15"/>
  <text
    x="50%" y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="system-ui, sans-serif"
    font-weight="700"
    font-size="${size * 0.38}"
    fill="#a855f7"
  >S</text>
</svg>`;
}

for (const size of [192, 512]) {
  const svgPath = path.join(ICONS_DIR, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg(size));
  console.log(`✓ Written ${svgPath}`);
  console.log(`  → Convert to PNG: npx sharp-cli -i public/icons/icon-${size}.svg -o public/icons/icon-${size}.png`);
}

console.log("\nDone. Convert SVGs to PNGs before deploying for full PWA installability.");
