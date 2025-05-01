// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import { ExectueCommand, SerializedFetch } from "./server";

contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command: Parameters<ExectueCommand>[0]) =>
    ipcRenderer.invoke("execute-command", command),
  ipcFetch: (...args: Parameters<SerializedFetch>) =>
    ipcRenderer.invoke("ipc-fetch", ...args),
});

declare global {
  interface Window {
    electronAPI: {
      executeCommand: ExectueCommand;
      ipcFetch: SerializedFetch;
    };
  }
}
