// Renders tools/build-models.html in headless Chromium and saves the models.
// Needs Playwright (`npm i -g playwright`). Usage: node tools/build-models.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const playwrightPath = (() => {
  try { return require.resolve("playwright"); } catch { return path.join(execSync("npm root -g").toString().trim(), "playwright"); }
})();
const { chromium } = require(playwrightPath);

// Serve three from a local install if one is around (offline builds),
// otherwise let the page load it from the CDN.
const localThree = (() => {
  for (const dir of [process.env.THREE_DIR, path.join(__dirname, "node_modules/three"), path.join(process.cwd(), "node_modules/three")]) {
    if (dir && fs.existsSync(path.join(dir, "build/three.module.js"))) return dir;
  }
  return null;
})();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error(e));
  if (localThree) {
    await page.route("https://cdn.jsdelivr.net/npm/three@0.186.0/**", (route) => {
      const rel = route.request().url().split("three@0.186.0/")[1];
      route.fulfill({ path: path.join(localThree, rel), contentType: "text/javascript" });
    });
  }
  await page.goto("file://" + path.join(__dirname, "build-models.html"));
  const models = await page.evaluate(() => window.models);
  const out = path.join(__dirname, "..", "models");
  fs.mkdirSync(out, { recursive: true });
  for (const [name, b64] of Object.entries(models)) {
    const file = path.join(out, `arthur-${name}.glb`);
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    console.log(file, fs.statSync(file).size, "bytes");
  }
  await browser.close();
})();
