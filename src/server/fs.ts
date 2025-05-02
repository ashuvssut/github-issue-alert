import { app } from "electron";
import fs from "fs";
import https from "https";
import path from "path";

/**
 * Ensures a subdirectory exists inside Electron's userData directory.
 * If it doesn't exist, it will be created.
 *
 * @param subfolderName - Name of the subfolder to create
 * @returns Absolute path to the created or existing folder
 */
export function ensureUserDataSubfolder(subfolderName: string): string {
  const dirPath = path.join(app.getPath("userData"), subfolderName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

export function downloadFileToPath(
  url: string,
  destPath: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);

    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve(destPath)); // Return the path on success
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // Cleanup on error
        resolve(null); // Return null if error occurs
      });
  });
}

export function checkFileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
}
