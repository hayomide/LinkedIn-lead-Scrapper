require("dotenv/config");

const executablePath = process.env.EXECUTABLE_PATH_WINDOWS;
const headless = !(process.env.CHROME_NON_HEADLESS * 1);
const linkedInAccountUsername = process.env.LINKEDIN_ACCOUNT_USERNAME;
const linkedInAccountPassword = process.env.LINKEDIN_ACCOUNT_PASSWORD;

module.exports = { executablePath, headless, linkedInAccountUsername, linkedInAccountPassword };
