import { ipcMain } from "electron";
import { DEFAULT_SETTINGS } from "../shared/types";

/**
 * 機密情報を部分的にマスクする
 */
function maskSecret(val: any): string {
  if (typeof val !== "string" || !val) return String(val);
  const len = val.length;
  if (len <= 4) return "****";
  // 最低でも3分の1以上を隠し、前後最大4文字を表示する
  const show = Math.min(4, Math.floor(len / 3));
  if (show === 0) return "****";
  return `${val.slice(0, show)}....${val.slice(-show)}`;
}

export function registerIpcHandlers() {
  // ── 設定 ──
  ipcMain.handle("settings:get", async () => {
    console.log("[Mock IPC] settings:get called");
    return DEFAULT_SETTINGS;
  });

  ipcMain.handle("settings:set", async (_event, settings) => {
    const sanitized = { ...settings };
    if ("apiKey" in sanitized) sanitized.apiKey = maskSecret(sanitized.apiKey);
    if ("moocsPassword" in sanitized) sanitized.moocsPassword = maskSecret(sanitized.moocsPassword);

    console.log("[Mock IPC] settings:set called", sanitized);
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
      hasApiKey: true,
    };
  });
}
