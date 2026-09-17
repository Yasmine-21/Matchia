import sharp from "file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error("Usage: node rasterize_drawio_svgs.mjs <directory>");
const entries = (await fs.readdir(sourceDir)).filter((name) => name.startsWith("drawio_") && name.endsWith(".svg"));
for (const name of entries) {
  const input = path.join(sourceDir, name);
  const output = path.join(sourceDir, name.replace(/\.svg$/i, ".png"));
  await sharp(input, { density: 96, limitInputPixels: false }).png({ compressionLevel: 9, palette: false }).toFile(output);
  const metadata = await sharp(output).metadata();
  console.log(`${name} -> ${path.basename(output)} (${metadata.width}x${metadata.height})`);
}
