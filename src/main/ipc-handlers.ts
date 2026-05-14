/**
 * IPCハンドラー登録
 *
 * RendererプロセスからのIPCリクエストを処理するハンドラーを登録する。
 *
 * チャネル:
 * - chat:send: チャットメッセージを送信
 * - chat:cancel: チャット送信をキャンセル
 * - chat:list: チャット履歴を取得
 * - chat:clear: チャット履歴をクリア
 * - app:status: アプリケーションステータスを取得
 */

import { ipcMain } from "electron";
import { toSerializableError } from "../shared/types/errors";
import { InMemoryStore } from "./services/in-memory-store";
import { MockChatService } from "./services/mock-chat-service";

const store = new InMemoryStore();
const chatService = new MockChatService(store);

/**
 * エラーハンドリングラッパー
 * 全IPCハンドラーのエラーをキャッチしてシリアライズ可能な形式に変換する
 */
async function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<
  { success: true; data: T } | { success: false; error: { code: string; message: string } }
> {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toSerializableError(error) };
  }
}

/**
 * IPCハンドラーを登録する
 */
export function registerIpcHandlers(): void {
  ipcMain.handle("chat:send", async (_event, userText: string) => {
    return withErrorHandler(async () => {
      if (!userText || typeof userText !== "string") {
        throw new Error("INVALID_INPUT");
      }
      if (userText.trim().length === 0) {
        throw new Error("EMPTY_INPUT");
      }
      return await chatService.sendChat(userText);
    });
  });

  ipcMain.handle("chat:list", async () => {
    return withErrorHandler(async () => {
      return store.getHistory();
    });
  });

  ipcMain.handle("chat:clear", async () => {
    return withErrorHandler(async () => {
      store.clearHistory();
    });
  });

  ipcMain.handle("app:status", async () => {
    return withErrorHandler(async () => {
      return store.getAppStatus();
    });
  });

  ipcMain.handle("chat:cancel", async () => {
    return withErrorHandler(async () => {
      chatService.cancelChat();
    });
  });
}

export const testExports = {
  store,
  chatService,
};
