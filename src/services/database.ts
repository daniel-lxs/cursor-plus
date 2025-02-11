import * as path from "path";
import * as os from "os";
import * as jwt from "jsonwebtoken";
import * as vscode from "vscode";
import * as fs from "fs";
import initSqlJs from "sql.js";
import { log } from "../utils/logger";
import { execSync } from "child_process";

export function getCursorDBPath(): string {
  const appName = vscode.env.appName;
  const folderName = appName === "Cursor Nightly" ? "Cursor Nightly" : "Cursor";

  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || "",
      folderName,
      "User",
      "globalStorage",
      "state.vscdb",
    );
  } else if (process.platform === "linux") {
    const isWSL = vscode.env.remoteName === "wsl";
    if (isWSL) {
      const windowsUsername = getWindowsUsername();
      if (windowsUsername) {
        return path.join(
          "/mnt/c/Users",
          windowsUsername,
          "AppData/Roaming",
          folderName,
          "User/globalStorage/state.vscdb",
        );
      }
    }
    return path.join(
      os.homedir(),
      ".config",
      folderName,
      "User",
      "globalStorage",
      "state.vscdb",
    );
  } else if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      folderName,
      "User",
      "globalStorage",
      "state.vscdb",
    );
  }
  return path.join(
    os.homedir(),
    ".config",
    folderName,
    "User",
    "globalStorage",
    "state.vscdb",
  );
}

export async function getCursorTokenFromDB(): Promise<string | undefined> {
  try {
    const dbPath = getCursorDBPath();

    log(`Platform: ${process.platform}`);
    log(`Home directory: ${os.homedir()}`);
    log(`Attempting to open database at: ${dbPath}`);
    log(`Database path exists: ${fs.existsSync(dbPath)}`);

    if (!fs.existsSync(dbPath)) {
      log("Database file does not exist", true);
      return undefined;
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(dbBuffer));

    log("Successfully opened database connection");
    log("Executing SQL query for token...");

    const result = db.exec(
      "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'",
    );

    if (!result.length || !result[0].values.length) {
      log("No token found in database");
      db.close();
      return undefined;
    }

    const token = result[0].values[0][0] as string;
    log(`Token length: ${token.length}`);
    log(`Token starts with: ${token.substring(0, 20)}...`);

    try {
      const decoded = jwt.decode(token, { complete: true });
      log(`JWT decoded successfully: ${!!decoded}`);
      log(`JWT payload exists: ${!!(decoded && decoded.payload)}`);
      log(
        `JWT sub exists: ${!!(decoded && decoded.payload && decoded.payload.sub)}`,
      );

      if (!decoded || !decoded.payload || !decoded.payload.sub) {
        log("Invalid JWT structure: " + JSON.stringify({ decoded }), true);
        db.close();
        return undefined;
      }

      const sub = decoded.payload.sub.toString();
      log(`Sub value: ${sub}`);
      const userId = sub.split("|")[1];
      log(`Extracted userId: ${userId}`);
      const sessionToken = `${userId}%3A%3A${token}`;
      log(`Created session token, length: ${sessionToken.length}`);
      db.close();
      return sessionToken;
    } catch (error: any) {
      log("Error processing token: " + error, true);
      log(
        "Error details: " +
          JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          }),
        true,
      );
      db.close();
      return undefined;
    }
  } catch (error: any) {
    log("Error opening database: " + error, true);
    log(
      "Database error details: " +
        JSON.stringify({
          message: error.message,
          stack: error.stack,
        }),
      true,
    );
    return undefined;
  }
}
export function getWindowsUsername(): string | undefined {
  try {
    // Executes cmd.exe and echoes the %USERNAME% variable
    const result = execSync('cmd.exe /C "echo %USERNAME%"', {
      encoding: "utf8",
    });
    const username = result.trim();
    return username || undefined;
  } catch (error) {
    console.error("Error getting Windows username:", error);
    return undefined;
  }
}
