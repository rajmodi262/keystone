import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text());
});

// 1) Landing
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/01-landing.png` });
console.log("01 landing");

// 2) Sign in -> dashboard
await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("button[type=submit]");
await page.waitForTimeout(3000);
await page.fill("input[type=email]", "demo@keystone.dev");
await page.fill("input[type=password]", "password123");
await page.click("button[type=submit]");
await page.waitForURL("**/app", { timeout: 30000 });
await page.waitForSelector("text=Workspaces", { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-dashboard.png` });
console.log("02 dashboard");

// 3) Project workspace
await page.click('a[href^="/app/projects/"]');
await page.waitForURL("**/app/projects/**", { timeout: 30000 });
try {
  await page.waitForSelector("svg", { timeout: 45000 });
  await page.waitForTimeout(3200); // let the blast-radius animation settle
} catch {
  console.log("svg not found — capturing whatever rendered");
  await page.waitForTimeout(2000);
}
await page.screenshot({ path: `${OUT}/03-impact-graph.png` });
console.log("03 impact graph");

// 4) Ask -> conflict card
try {
  await page.getByText("What concrete strength is required?").first().click();
  await page.waitForSelector("text=CONTRADICTION", { timeout: 25000 });
  await page.waitForTimeout(800);
} catch {
  console.log("conflict card not found — capturing current state");
}
await page.screenshot({ path: `${OUT}/04-conflict-ask.png`, fullPage: true });
console.log("04 conflict ask");

await browser.close();
console.log("done ->", OUT);
