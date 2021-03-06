/* scrape */
const { join } = require("path");

const { launchBrowser } = require("spider-core");
const { executablePath, headless, linkedInAccountUsername, linkedInAccountPassword } = require("../config");

const proxiesFile = join(__dirname, "../proxies.txt");

const signIn = async (page) => {
    console.log("Trying to login ...");
    if (!linkedInAccountUsername || !linkedInAccountPassword) {
        console.error("LinkedIn login credentials not well provided");
        return;
    }

    try {
        console.log("Entering LinkedIn username...");
        const username = await page.waitForSelector('[name="session_key"]');
        await username.click({ clickCount: 3 });
        await username.type(linkedInAccountUsername, { delay: 400 });
        await page.keyboard.press("Tab");
    } catch (e) {
        console.error("Unable to input LinkedIn username!", e);
        return;
    }

    try {
        console.log("Entering LinkedIn password...");
        const password = await page.waitForSelector('[name="session_password"]');
        await password.click({ clickCount: 3 });
        await password.type(linkedInAccountPassword, { delay: 500 });
        await page.waitForTimeout(20);
    } catch (e) {
        console.error("Unable to input LinkedIn passowrd!", e);
        return;
    }

    // CLick Login  button
    try {
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: "networkidle0" });
        console.log("Login Successful..");
        await page.waitForTimeout(20000);
    } catch (e) {
        console.error("Unable to login", e);
    }
};

const visitPage = async (keyword) => {
    if (!keyword) return console.log("No keyword was passed!");

    const [createNewPage, exitBrowser] = await launchBrowser({
        executablePath,
        headless,
        proxiesFile,
        userDataDir: "linkedIn-app",
    });

    const [page] = await createNewPage();

    const url = "https://www.linkedin.com/";
    try {
        console.log(`Opening ${url} ...\n`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
    } catch (err) {
        console.error("Unable to open url", err);
        await exitBrowser();
        return;
    }

    try {
        await page.waitForSelector('[name="session_key"]');
        await signIn(page);
    } catch (e) {
        console.error("Already signin!");
    }

    try {
        console.log(`Searching for ${keyword} profiles...`);
        const search = await page.waitForSelector('[placeholder="Search"]');
        await search.click({ clickCount: 1 });
        await search.type(keyword, { delay: 500 });
        await page.keyboard.press("Enter");
    } catch (e) {
        console.error(`Unable to search for ${keyword} profiles`, e);
        return;
    }

    // click the people
    console.log("clicking People...");
    try {
        const ppl = await page.waitForSelector('button[aria-label="People"]');
        await ppl.click({ clickCount: 1 });
        await page.waitForTimeout(30000);
    } catch (e) {
        console.error("unable to click people", e);
        await page.waitForTimeout(20000);
        await exitBrowser();
        return;
    }

    await page.waitForTimeout(12000000);

    await exitBrowser();
};

module.exports = { visitPage };
