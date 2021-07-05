const fs = require("fs");
const { join } = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const { botDataDir, gottenDataDir } = require("./io");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const TOKEN_PATH = join(botDataDir, "google-sheet-token.json");
const SHEET_ID_PATH = join(botDataDir, "google-sheet-id.txt");
const SHEET_JSON = join(botDataDir, "google-sheet-credentials.json");
const SHEET_JSON_FILE = join(gottenDataDir, "sheet.json");

let sheetCols = [];
let apartments = [];
let apartmentsLen = 0;

const writeToSheet = (data, shouldWriteSheet2 = true) => {
    if (!data || !Array.isArray(data) || data.length < 1) return console.error("No valid data to write to Sheet");

    apartments = [...data];
    apartmentsLen = apartments.length;

    if (apartmentsLen > 0) {
        sheetCols = Object.keys(apartments[0]);
        apartments.shift();
        apartments = apartments.map((h) =>
            Object.values({
                ID: "",
                Name: "",
                Link: "",
                "Type Of House": "",
                Location: "",
                Host: "",
                "Start Date": "",
                "End Date": "",
                "Price Per Night": "",
                "20% Discount": "",
                "Discounted Price Per Night": "",
                ...h,
            })
        );

        fs.readFile(SHEET_JSON, "utf8", (err, content) => {
            if (err) return console.log("Error loading client secret file:", err);
            authorize(JSON.parse(content), (auth) => startWriting(auth, shouldWriteSheet2));
        });
    }
};

const writeToSheetFromFile = () =>
    fs.readFile(SHEET_JSON_FILE, "utf8", (err, content) => {
        if (err) return console.error("Unable to read apartments from JSON", err);
        if (!content) return console.error("No data to write to Sheet");

        try {
            writeToSheet(JSON.parse(content));
        } catch (e) {
            console.error("Apartments not in the write format");
        }
    });

function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error("Error while trying to retrieve access token", err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log("Token stored to", TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function startWriting(auth) {
    const sheets = google.sheets({ version: "v4", auth });

    const maxRows = 300;
    let calls = 0;

    const values = [sheetCols, ...apartments];
    const writeToSheet = (sheetID, values) =>
        new Promise((resolve, reject) => {
            const spreadsheetId = sheetID;
            const valueInputOption = "USER_ENTERED";

            const rowStart = calls * maxRows + 1;
            const rowEnd = (calls + 1) * 300;
            const range = `Sheet1!A${rowStart}:K${rowEnd}`;
            const req = { spreadsheetId, range, valueInputOption, resource: { values } };

            sheets.spreadsheets.values.update(req, (err, result) => {
                if (err) return reject(err);
                calls++;
                resolve(result);
            });
        });

    const writeToSheetLazy = async (sheetID) => {
        while (values.length > 0)
            try {
                const { data } = await writeToSheet(sheetID, values.splice(0, maxRows));
                console.log("%d columns and %d rows updated on sheet1.", data.updatedColumns, data.updatedRows);
            } catch (err) {
                console.error("Could not update sheet", err);
            }
    };

    const createSheet = () => {
        const resource = { properties: { title: "Costa Rica Apartments" } };
        const req = { resource, fields: "spreadsheetId" };
        sheets.spreadsheets.create(req, (err, spreadsheet) => {
            if (err) return console.log("Could not create sheet", err);
            const sheetID = spreadsheet.data.spreadsheetId;
            if (!sheetID) return console.error("Sheet ID is not defined");
            fs.writeFile(SHEET_ID_PATH, sheetID, (err) => {
                if (err) return console.error("Could not save sheet ID", err);
                console.log("Sheet ID saved");
            });
            writeToSheetLazy(sheetID);
        });
    };

    fs.readFile(SHEET_ID_PATH, "utf-8", (err, sheetID) => {
        if (err || !sheetID) return createSheet();
        writeToSheetLazy(sheetID);
    });
}

module.exports = { writeToSheet, writeToSheetFromFile };
