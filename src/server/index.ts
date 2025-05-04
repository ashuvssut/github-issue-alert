import {
  AppPathName,
  ExectueCommand,
  executeCommand,
  serializedFetch,
  SerializedFetch,
  showIssueNotification,
  ShowIssueNotification,
} from "./ipcHandlers";
import { app, ipcMain, shell } from "electron";

const initiateHandlers = () => {
  ipcMain.handle(
    "executeCommand",
    async (_event, arg: Parameters<ExectueCommand>[0]) => {
      return executeCommand(arg);
    }
  );

  ipcMain.handle(
    "ipcFetch",
    async (_event, ...args: Parameters<SerializedFetch>) => {
      return serializedFetch(...args);
    }
  );

  ipcMain.handle("openUrl", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle(
    "showIssueNotification",
    (_event, args: Parameters<ShowIssueNotification>[0]) => {
      showIssueNotification(args);
    }
  );

  ipcMain.handle("appGetPath", (_event, pathName: AppPathName) => {
    return app.getPath(pathName);
  });
};

export const initIpc = () => {
  try {
    initiateHandlers();
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("Attempted to register a second handler")
    ) {
      console.warn("[initIpc] Handlers already registered. Skipping.");
    } else {
      console.error("[initIpc] Uncaught exception:", e);
      throw e; // rethrow unexpected errors
    }
  }
};
