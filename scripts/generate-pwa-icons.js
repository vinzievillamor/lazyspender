// One-off script to generate PWA icon assets from existing brand assets.
// Run with: node scripts/generate-pwa-icons.js <frontend-dir>
const path = require("path");

async function main() {
  const frontendDir = process.argv[2];
  if (!frontendDir) {
    throw new Error("Usage: node generate-pwa-icons.js <frontend-dir>");
  }

  const Jimp = require(path.join(frontendDir, "node_modules", "jimp-compact"));

  const images = path.join(frontendDir, "assets", "images");
  const outDir = path.join(frontendDir, "public", "icons");

  // Note: assets/images/icon.png and android-icon-background.png both have design-tool
  // guide lines (circles/crosshair) baked into the exported PNG, so neither is used here.
  // PWA icons are instead the clean foreground composited over a solid fill matching
  // adaptiveIcon.backgroundColor (#E6F4FE) in app.config.js.
  const foregroundSrc = await Jimp.read(path.join(images, "android-icon-foreground.png"));
  const BACKGROUND_COLOR = 0xe6f4feff; // #E6F4FE, RGBA

  async function composite(size) {
    const background = new Jimp(size, size, BACKGROUND_COLOR);
    const foreground = foregroundSrc.clone().resize(size, size);
    background.composite(foreground, 0, 0);
    return background;
  }

  await (await composite(192)).writeAsync(path.join(outDir, "icon-192.png"));
  await (await composite(512)).writeAsync(path.join(outDir, "icon-512.png"));
  await (await composite(180)).writeAsync(path.join(outDir, "apple-touch-icon.png"));

  // Maskable icon: the adaptive-icon foreground/background pair already has Android's
  // safe-zone padding, which also protects it from PWA maskable-icon cropping.
  await (await composite(512)).writeAsync(path.join(outDir, "icon-maskable-512.png"));

  console.log("Generated PWA icons in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
