const fs = require("fs").promises;
const puppeteer = require("puppeteer");
require("dotenv").config();

async function crawler() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const domains = await readWebsites();
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
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

      await page.goto(`http://${domain}/wp-admin/plugins.php`, {
        waitUntil: "networkidle2",
      });

      const updateButton = await page.$("tr#mainwp-child-update .update-link");
      if (updateButton) {
        await updateButton.click();
        await page.waitForSelector(".updated-message", { timeout: 30000 });

        const updatedMessage = await page.$(".updated-message");
        if (updatedMessage) {
          console.log(`Plugin atualizado com sucesso em ${domain}`);
        } else {
          console.log(
            `Erro ao atualizar plugin em ${domain}: Plugin não atualizado.`
          );
          failedDomains.push(domain);
        }
      } else {
        console.log(`Plugin não encontrado em ${domain}`);
      }
    } catch (error) {
      console.error(`Erro ao atualizar plugin em ${domain}: ${error}`);
      failedDomains.push(domain);
    }
  }

  await saveFailedDomains(failedDomains);
  await browser.close();
  process.exit();
}

async function readWebsites() {
  try {
    const data = await fs.readFile("list-websites.txt", "utf8");
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
    await fs.writeFile("failed-domains.txt", failedDomains.join("\n"));
    console.log("Domínios com falha foram salvos em failed-domains.txt");
  } catch (error) {
    console.error("Erro ao salvar domínios com falha:", error);
  }
}

crawler();
