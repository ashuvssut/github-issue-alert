// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type {
  AppPathName,
  ExectueCommand,
  SerializedFetch,
  ShowIssueNotification,
} from "./server/ipcHandlers";

contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command: Parameters<ExectueCommand>[0]) =>
    ipcRenderer.invoke("executeCommand", command),
  ipcFetch: (...args: Parameters<SerializedFetch>) =>
    ipcRenderer.invoke("ipcFetch", ...args),
  openUrl: (url: string) => ipcRenderer.invoke("openUrl", url),
  showIssueNotification: (args: Parameters<ShowIssueNotification>[0]) =>
    ipcRenderer.invoke("showIssueNotification", args),
  appGetPath: (pathName: AppPathName) =>
    ipcRenderer.invoke("appGetPath", pathName),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI: {
      executeCommand: ExectueCommand;
      ipcFetch: SerializedFetch;
      openUrl: (url: string) => void;
      showIssueNotification: ShowIssueNotification;
      appGetPath: (pathName: AppPathName) => string;
      platform: NodeJS.Platform;
    };
  }
}
