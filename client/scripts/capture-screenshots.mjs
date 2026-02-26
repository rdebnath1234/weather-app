import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.resolve(projectRoot, "..", "docs", "screenshots");
const baseUrl = "http://127.0.0.1:4173";

const sampleWeather = {
  city: "Tokyo",
  country: "JP",
  temperature: 27.2,
  feelsLike: 30.1,
  description: "clear sky",
  icon: "01d",
  humidity: 82,
  pressure: 1008,
  visibility: 9000,
  windSpeed: 8,
  sunrise: 1770525600,
  sunset: 1770575400,
  timezone: 32400,
  forecast: {
    hourly: [
      { time: 1770532800, temp: 27, icon: "01d", pop: 0.23 },
      { time: 1770536400, temp: 28, icon: "01d", pop: 0.29 },
      { time: 1770540000, temp: 28, icon: "02d", pop: 0.58 },
      { time: 1770543600, temp: 29, icon: "02d", pop: 0.75 },
      { time: 1770547200, temp: 30, icon: "01d", pop: 0.33 },
      { time: 1770550800, temp: 29, icon: "02d", pop: 0.2 },
      { time: 1770554400, temp: 29, icon: "02d", pop: 0.73 },
      { time: 1770558000, temp: 28, icon: "01d", pop: 0.49 },
    ],
    daily: [
      { date: "2026-02-27", minTemp: 22, maxTemp: 29, icon: "01d" },
      { date: "2026-02-28", minTemp: 21, maxTemp: 28, icon: "02d" },
      { date: "2026-03-01", minTemp: 20, maxTemp: 27, icon: "10d" },
      { date: "2026-03-02", minTemp: 19, maxTemp: 26, icon: "10d" },
      { date: "2026-03-03", minTemp: 21, maxTemp: 30, icon: "01d" },
    ],
  },
};

const sampleFavorites = {
  favorites: [
    { _id: "fav1", city: "Tokyo", country: "JP" },
    { _id: "fav2", city: "Dhaka", country: "BD" },
  ],
};

const sampleHistory = {
  history: [
    { _id: "h1", city: "Tokyo", country: "JP" },
    { _id: "h2", city: "New York", country: "US" },
    { _id: "h3", city: "Paris", country: "FR" },
  ],
};

const waitForServer = async () => {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Vite server did not start in time.");
};

const startDevServer = () =>
  spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: projectRoot,
    stdio: "ignore",
    shell: true,
  });

const setupMockApi = async (page) => {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();

    if (pathname === "/api/weather" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleWeather) });
      return;
    }
    if (pathname === "/api/auth/login" && method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "demo-token",
          user: { id: "u1", name: "Isabella", email: "isabella@example.com" },
        }),
      });
      return;
    }
    if (pathname === "/api/auth/register" && method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          token: "demo-token",
          user: { id: "u1", name: "Isabella", email: "isabella@example.com" },
        }),
      });
      return;
    }
    if (pathname === "/api/user/favorites" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify(sampleFavorites),
      });
      return;
    }
    if (pathname === "/api/user/history" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify(sampleHistory),
      });
      return;
    }
    if (pathname === "/api/user/favorites" && method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(sampleFavorites),
      });
      return;
    }
    if (pathname.startsWith("/api/user/favorites/") && method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ favorites: sampleFavorites.favorites.slice(1) }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const devServer = startDevServer();

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1728, height: 1117 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await setupMockApi(page);

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(outputDir, "01-dashboard-guest.png"), fullPage: true });

    await page.fill("#city-search", "Tokyo");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outputDir, "02-weather-search.png"), fullPage: true });

    await page.getByRole("button", { name: /Temperature curve|Rain precipitation/ }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, "03-rain-chart-mode.png"), fullPage: true });

    await page.getByRole("button", { name: "Register" }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outputDir, "04-register-form.png"), fullPage: true });

    await page.getByRole("button", { name: "Login" }).first().click();
    await page.waitForTimeout(200);
    await page.fill("#login-email", "isabella@example.com");
    await page.fill("#login-password", "secret123");
    await page.locator("form.auth-form button[type='submit']").click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, "05-logged-in-favorites-history.png"), fullPage: true });

    await browser.close();
    devServer.kill("SIGTERM");
  } catch (error) {
    devServer.kill("SIGTERM");
    throw error;
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
