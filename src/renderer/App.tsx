import React, { useState, useRef, useEffect } from "react";
import { ChatView } from "./components/ChatView";
import { ChatInput } from "./components/ChatInput";
import { StatusBar } from "./components/StatusBar";
import { SettingsView } from "./components/SettingsView";
import { ChatTurn } from "../shared/types/chat";
import "./index.css";

/** 現在表示中のビュー */
type ViewType = "chat" | "settings";

// ダミーデータ（モック）
const MOCK_MESSAGES: ChatTurn[] = [
  {
    id: crypto.randomUUID(),
    role: "user",
    content: "Pythonのリスト内包表記について教えてください",
    timestamp: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "リスト内包表記は、既存のリストなどから新しいリストを簡潔に生成するための構文です。\n例えば `[x*2 for x in range(5)]` のように記述します。",
    citations: [
      {
        title: "Python基礎 第5回 スライド p.12",
        url: "https://moocs.iniad.org/courses/2026/python-basic/05/slide#12",
      },
      {
        title: "Python基礎 第5回 演習問題",
        url: "https://moocs.iniad.org/courses/2026/python-basic/05/exercise",
      },
    ],
    timestamp: new Date().toISOString(),
  },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatTurn[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [mcpConnectionStatus, setMcpConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connected");
  const [currentView, setCurrentView] = useState<ViewType>("chat");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /** ビュー切替 */
  const switchView = (target: ViewType) => {
    if (target === currentView) return;
    setCurrentView(target);
  };

  const handleSend = (text: string) => {
    // ユーザーのメッセージを追加
    const newUserMsg: ChatTurn = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    // AIの返答をシミュレート（1秒後）
    timeoutRef.current = setTimeout(() => {
      const newAiMsg: ChatTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `「${text}」ですね。モック画面なのでダミーの回答を返しています。本番ではここにAPIからの回答が入ります。`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAiMsg]);
      setIsLoading(false);
    }, 1000);
  };

  const isChat = currentView === "chat";

  return (
    <div className="app">
      <header className="app-header">
        {isChat ? (
          <>
            <h1>INIAD AI Chat Enhanced</h1>
            <button
              className="settings-button"
              onClick={() => switchView("settings")}
              aria-label="設定を開く"
            >
              ⚙ 設定
            </button>
          </>
        ) : (
          <>
            <h1>設定</h1>
            <button
              className="settings-button"
              onClick={() => switchView("chat")}
              aria-label="設定を閉じる"
            >
              ✕
            </button>
          </>
        )}
      </header>

      {/* 両ビューを常にマウントし、CSSトランジションで切替 */}
      <div className={`view-layer ${isChat ? "view-active" : "view-hidden"}`}>
        <main className="app-main">
          <ChatView messages={messages} />
        </main>
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      <div className={`view-layer ${!isChat ? "view-active" : "view-hidden"}`}>
        <main className="app-main">
          <SettingsView onClose={() => switchView("chat")} />
        </main>
      </div>
      
      <StatusBar mcpStatus={mcpConnectionStatus} model="GPT-5.4-nano (Mock)" />
    </div>
  );
};

export default App;

