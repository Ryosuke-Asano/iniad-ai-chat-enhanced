import { ipcMain } from "electron";
import { settingsStore } from "./services/settings-store";
import { McpClient } from "./services/mcp-client";

// MCP クライアントのインスタンス化
const mcpClient = new McpClient();

export function registerIpcHandlers() {
  // ── 設定 ──
  ipcMain.handle("settings:get", async () => {
    return settingsStore.getSettings();
  });

  ipcMain.handle("settings:set", async (_event, settings) => {
    await settingsStore.updateSettings(settings);
    return { success: true };
  });

  ipcMain.handle("settings:test-api", async () => {
    const { apiKey, baseURL } = settingsStore.getRawSettings();
    if (!apiKey) return { success: false, error: "APIキーが設定されていません" };

    try {
      // 実際のエンドポイントに疎通確認
      const response = await fetch(`${baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = (await response.json()) as any;
        return {
          success: false,
          error: data?.error?.message || `エラー: ${response.status}`,
        };
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "接続に失敗しました",
      };
    }
  });

  ipcMain.handle("settings:test-mcp", async () => {
    const { moocsUsername, moocsPassword } = settingsStore.getRawSettings();
    if (!moocsUsername || !moocsPassword) {
      return { success: false, error: "MOOCs認証情報が設定されていません" };
    }

    try {
      await mcpClient.connect(moocsUsername, moocsPassword);
      await mcpClient.disconnect();
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "MCP接続テストに失敗しました",
      };
    }
  });

  // ── チャット（※現在はまだモックのまま） ──
  ipcMain.handle("chat:send", async (_event, text) => {
    console.log("[IPC] chat:send (Mock)", text);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `これはモックの応答です。あなたが入力したメッセージ: "${text}"\n\n(※現在、チャットエンジンとの統合は準備中です。)`,
      timestamp: new Date().toISOString(),
      model: settingsStore.getSettings().model,
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
      mcpStatus: mcpClient.getStatus(),
      model: settingsStore.getSettings().model,
      hasApiKey: settingsStore.hasApiKey(),
    };
  });
}
