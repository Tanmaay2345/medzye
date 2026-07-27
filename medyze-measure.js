const puppeteer = require("puppeteer-core");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

  const measure = async (selector, label) => {
    return page.evaluate(
      (sel, lbl) => {
        const el = document.querySelector(sel);
        if (!el) return { label: lbl, found: false };
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          label: lbl,
          found: true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: style.borderRadius,
          padding: style.padding,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          backgroundColor: style.backgroundColor,
          color: style.color,
          boxShadow: style.boxShadow,
          border: style.border,
          gap: style.gap,
        };
      },
      selector,
      label
    );
  };

  const results = [];
  results.push(await measure("header", "header"));
  results.push(await measure("header nav a[href='/sign-in']", "Sign In link"));
  results.push(await measure("header form, header > div > div:nth-child(2)", "search bar container"));
  results.push(await measure("input[type=search]", "search input"));
  results.push(await measure("a[href='/upload-prescription']", "Upload Prescription button"));
  results.push(await measure("a[href^='/category/']", "category chip (first)"));
  results.push(await measure("a[href^='/category/'] span", "category icon circle"));
  results.push(await measure(".grid.grid-cols-2.gap-4 > div", "medicine card (first)"));
  results.push(await measure(".grid.grid-cols-2.gap-4 > div button", "ADD button (card)"));
  results.push(await measure("span:has(> span.inline-flex.items-center.rounded-tl-xl)", "OTC badge wrapper"));
  results.push(await measure(".inline-flex.items-center.rounded-tl-xl", "OTC badge"));
  results.push(await measure("footer", "footer"));
  results.push(await measure("footer > div:first-child", "download band"));

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
