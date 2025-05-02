// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import {
  ExectueCommand,
  SerializedFetch,
  ShowIssueNotification,
} from "./server";

contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command: Parameters<ExectueCommand>[0]) =>
    ipcRenderer.invoke("execute-command", command),
  ipcFetch: (...args: Parameters<SerializedFetch>) =>
    ipcRenderer.invoke("ipc-fetch", ...args),
  openUrl: (url: string) => ipcRenderer.invoke("open-url", url),
  showIssueNotification: (args: Parameters<ShowIssueNotification>[0]) =>
    ipcRenderer.invoke("show-issue-notification", args),
});

declare global {
  interface Window {
    electronAPI: {
      executeCommand: ExectueCommand;
      ipcFetch: SerializedFetch;
      openUrl: (url: string) => void;
      showIssueNotification: ShowIssueNotification;
    };
  }
}
