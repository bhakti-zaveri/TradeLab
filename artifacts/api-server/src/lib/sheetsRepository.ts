import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

type TradeLabEvent = {
  type: "order" | "journal";
  id: string;
  symbol: string;
  user: string;
  payload: string;
  createdAt: string;
};

const connectors = new ReplitConnectors();
let spreadsheetId = process.env["TRADELAB_SPREADSHEET_ID"];
let spreadsheetPromise: Promise<string> | undefined;
let headerWritten = false;

async function ensureSpreadsheet() {
  if (spreadsheetId) return spreadsheetId;
  if (!spreadsheetPromise) {
    spreadsheetPromise = connectors
      .proxy("google-sheet", "/v4/spreadsheets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ properties: { title: "TradeLab Educational Simulator" } }),
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Google Sheets setup failed with ${response.status}.`);
        const data = (await response.json()) as { spreadsheetId?: string };
        if (!data.spreadsheetId) throw new Error("Google Sheets did not return a spreadsheet id.");
        spreadsheetId = data.spreadsheetId;
        return data.spreadsheetId;
      });
  }
  return spreadsheetPromise;
}

export async function appendTradeLabEvent(event: TradeLabEvent) {
  try {
    const id = await ensureSpreadsheet();
    const range = encodeURIComponent("Sheet1!A:F");
    const values = [
      [event.createdAt, event.type, event.id, event.symbol, event.user, event.payload],
    ];
    if (!headerWritten) {
      const headerResponse = await connectors.proxy(
        "google-sheet",
        `/v4/spreadsheets/${id}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            values: [["createdAt", "type", "id", "symbol", "user", "payload"]],
          }),
        },
      );
      if (!headerResponse.ok) throw new Error(`Google Sheets header write failed with ${headerResponse.status}.`);
      headerWritten = true;
    }
    const response = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${id}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values }),
      },
    );
    if (!response.ok) throw new Error(`Google Sheets event write failed with ${response.status}.`);
  } catch (error) {
    logger.warn({ err: error, eventType: event.type }, "TradeLab Sheets persistence unavailable");
  }
}