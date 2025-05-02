import { ipcMain, Notification, shell } from "electron";
import { exec } from "child_process";
import util from "util";
import fetch, { RequestInit, RequestInfo, Headers } from "node-fetch";
import {
  checkFileExists,
  downloadFileToPath,
  ensureUserDataSubfolder,
} from "./fs";
import path from "path";

const execPromise = util.promisify(exec);

const executeCommand = async (command: string) => {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) throw new Error(stderr);
    return { stdout };
  } catch (error: any) {
    return { error: error.message };
  }
};
export type ExectueCommand = typeof executeCommand;
ipcMain.handle("execute-command", async (_event, command: string) => {
  return executeCommand(command);
});

export type SerializedFetch = typeof serializedFetch;
type BodyParser = "arrayBuffer" | "formData" | "blob" | "json" | "text";
const serializedFetch = async <T extends BodyParser>(
  url: URL | RequestInfo,
  init?: RequestInit,
  /** @default json */
  bodyParser?: T
) => {
  const res = await fetch(url, init);

  type Body = null | Awaited<ReturnType<(typeof res)[BodyParser]>>;
  let body: Body = null;
  try {
    body = (await res[bodyParser || "json"]()) as Body;
  } catch (err) {
    body = null; // fallback in case body parsing fails
  }

  return {
    url: res.url,
    ok: res.ok,
    redirected: res.redirected,
    status: res.status,
    statusText: res.statusText,
    type: res.type,
    size: res.size,
    bodyUsed: res.bodyUsed,
    body,
    headers: serializeHeaders(res.headers),
  };
};
function serializeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
ipcMain.handle(
  "ipc-fetch",
  async (
    _event,
    url: URL | RequestInfo,
    init?: RequestInit,
    bodyParser?: BodyParser
  ) => {
    return serializedFetch(url, init, bodyParser);
  }
);

ipcMain.handle("open-url", (_event, url: string) => {
  shell.openExternal(url);
});

// Directory to store icons persistently
const iconDir = ensureUserDataSubfolder("icons");
const showIssueNotification = async ({
  title,
  body,
  openUrl,
  issuesByCreatedAtLink,
  iconUrl,
}: {
  title: string;
  body: string;
  openUrl: string;
  issuesByCreatedAtLink: string;
  iconUrl: string;
}) => {
  let icon: string | undefined;
  if (iconUrl) {
    try {
      const fileName = path.basename(new URL(iconUrl).pathname);
      const iconPath = path.join(iconDir, fileName);
      const exists = await checkFileExists(iconPath);

      if (exists) {
        icon = iconPath;
      } else {
        const filePath = await downloadFileToPath(iconUrl, iconPath);
        if (filePath) {
          icon = iconPath;
        } else console.warn("Failed to download icon");
      }
    } catch (e) {
      console.warn("Failed to load icon from URL", e);
    }
  }

  const notification = new Notification({
    title,
    body,
    icon,
    actions: [{ type: "button", text: "View all issues" }],
    closeButtonText: "Dismiss",
  });

  notification.on("click", () => {
    shell.openExternal(openUrl);
  });

  notification.on("action", (_, index) => {
    if (index === 0) {
      shell.openExternal(issuesByCreatedAtLink);
    }
  });

  notification.show();
};
export type ShowIssueNotification = typeof showIssueNotification;
ipcMain.handle(
  "show-issue-notification",
  (_event, args: Parameters<ShowIssueNotification>[0]) => {
    showIssueNotification(args);
  }
);
