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

export const initIpc = () => {
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
