const puppeteer = require("puppeteer-core");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const routes = process.argv.slice(2);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  for (const route of routes) {
    await page.goto(`http://localhost:3000${route}`, {
      waitUntil: "networkidle0",
      timeout: 20000,
    });
    const name = route === "/" ? "home" : route.replace(/\//g, "_");
    await page.screenshot({ path: `/tmp/qa/live${name}.png`, fullPage: true });
    console.log(`Screenshotted ${route} -> /tmp/qa/live${name}.png`);
  }

  await browser.close();
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
