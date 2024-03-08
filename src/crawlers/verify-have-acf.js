const fs = require("fs").promises;
const puppeteer = require("puppeteer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

async function crawler() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const domains = await readWebsites();
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_PASSWORD;
  const failedDomains = [];

  for (const domain of domains) {
    try {
      await page.goto(`http://${domain}/?root`, { waitUntil: "networkidle2" });

      const loginForm = await page.$("#user_login");

      if (!loginForm) {
        await page.goto(`http://${domain}/wp-admin`, {
          waitUntil: "networkidle2",
        });
      }

      await page.type("#user_login", username);
      await page.type("#user_pass", password);
      await page.click("#wp-submit");

      await new Promise((resolve) => setTimeout(resolve, 5000));

      await page.goto(`http://${domain}/wp-admin`, {
        waitUntil: "networkidle2",
      });

      const acfMenu = await page.$(
        'a[href="edit.php?post_type=acf-field-group"] .wp-menu-name'
      );

      console.log(
        acfMenu
          ? `ACF está instalado em ${domain}`
          : `ACF não está instalado em ${domain}`
      );
    } catch (error) {
      console.error(`Erro ao verificar ACF em ${domain}: ${error}`);
      failedDomains.push(domain);
    }
  }

  await saveFailedDomains(failedDomains);
  await browser.close();
  process.exit();
}

async function readWebsites() {
  try {
    const data = await fs.readFile("../../list-websites.txt", "utf8");
    return data
      .split("\n")
      .map((domain) => domain.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Erro ao ler arquivo de websites:", error);
    return [];
  }
}

async function saveFailedDomains(failedDomains) {
  try {
    await fs.writeFile("../../failed-domains.txt", failedDomains.join("\n"));
    console.log("Domínios com falha foram salvos em failed-domains.txt");
  } catch (error) {
    console.error("Erro ao salvar domínios com falha:", error);
  }
}

crawler();
