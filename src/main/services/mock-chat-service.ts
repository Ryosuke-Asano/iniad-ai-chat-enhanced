/**
 * モックチャットサービス（UI開発用）
 *
 * 本物のINIAD APIクライアント（B09）実装までの一時的な実装。
 * リアルな遅延とキーワードベースの応答をシミュレートする。
 */

import type { ChatResponse, Citation, ChatTurn } from "../../shared/types";
import type { InMemoryStore } from "./in-memory-store";

const MOCK_RESPONSES: Array<{
  keywords: string[];
  response: string;
  citations: Citation[];
}> = [
  {
    keywords: ["python", "リスト", "内包"],
    response:
      "リスト内包表記は、既存のリストなどから新しいリストを簡潔に生成するための構文です。\n\n例：`[x * 2 for x in range(10)]` は0から18までの偶数のリストを生成します。",
    citations: [
      {
        title: "Python基礎 第5回 スライド p.12",
        url: "https://moocs.iniad.org/courses/2026/python-basic/05/slide#12",
        snippet: "リスト内包表記の構文と使用例",
      },
    ],
  },
  {
    keywords: ["tcp", "udp", "プロトコル"],
    response:
      "TCPとUDPはどちらもトランスポート層のプロトコルですが、以下の違いがあります。\n\n- TCP: 信頼性重視、接続型、順序制御あり\n- UDP: 速度重視、非接続型、順序制御なし",
    citations: [
      {
        title: "ネットワーク基礎 第8回 講義資料",
        url: "https://moocs.iniad.org/courses/2026/network-basic/08/lecture",
      },
    ],
  },
];

const DEFAULT_RESPONSE =
  "申し訳ありませんが、その質問にはお答えできません。別の言い方で質問するか、INIAD MOOCsの講義資料を確認してください。";

export class MockChatService {
  private cancelled = false;
  private store: InMemoryStore;

  constructor(store: InMemoryStore) {
    this.store = store;
  }

  async sendChat(userText: string): Promise<ChatResponse> {
    this.cancelled = false;
    const startTime = Date.now();

    const userMessage: ChatTurn = {
      id: this.generateId(),
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };
    this.store.addMessage(userMessage);

    const delay = 500 + Math.random() * 1000;
    await this.delay(delay);

    if (this.cancelled) {
      throw new Error("CHAT_CANCELLED");
    }

    const mockResponse = this.findResponse(userText);

    const assistantMessage: ChatTurn = {
      id: this.generateId(),
      role: "assistant",
      content: mockResponse.response,
      citations: mockResponse.citations,
      timestamp: new Date().toISOString(),
    };
    this.store.addMessage(assistantMessage);

    return {
      content: mockResponse.response,
      citations: mockResponse.citations,
      latencyMs: Date.now() - startTime,
    };
  }

  cancelChat(): void {
    this.cancelled = true;
  }

  private findResponse(userText: string): { response: string; citations: Citation[] } {
    const lowerText = userText.toLowerCase();
    for (const mock of MOCK_RESPONSES) {
      if (mock.keywords.some((kw) => lowerText.includes(kw))) {
        return { response: mock.response, citations: mock.citations };
      }
    }
    return { response: DEFAULT_RESPONSE, citations: [] };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
