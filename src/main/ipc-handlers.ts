import { ipcMain } from "electron";
import { DEFAULT_SETTINGS } from "../shared/types";

export function registerIpcHandlers() {
  // ── 設定 ──
  ipcMain.handle("settings:get", async () => {
    console.log("[Mock IPC] settings:get called");
    return DEFAULT_SETTINGS;
  });

  ipcMain.handle("settings:set", async (_event, settings) => {
    console.log("[Mock IPC] settings:set called", settings);
    return { success: true };
  });

  ipcMain.handle("settings:test-api", async () => {
    console.log("[Mock IPC] settings:test-api called");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { success: true };
  });

  ipcMain.handle("settings:test-mcp", async () => {
    console.log("[Mock IPC] settings:test-mcp called");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { success: true };
  });

  // ── チャット ──
  ipcMain.handle("chat:send", async (_event, text) => {
    console.log("[Mock IPC] chat:send called", text);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `これはモックの応答です。あなたが入力したメッセージ: "${text}"`,
      timestamp: new Date().toISOString(),
      model: "gpt-5.4-mini",
    };
  });

  ipcMain.handle("chat:list", async () => {
    return [];
  });

  ipcMain.handle("chat:clear", async () => {
    return;
  });

  ipcMain.handle("chat:cancel", async () => {
    return;
  });

  // ── ステータス ──
  ipcMain.handle("app:status", async () => {
    return {
      mcpStatus: "connected",
      model: "gpt-5.4-mini",
    };
  });
}
