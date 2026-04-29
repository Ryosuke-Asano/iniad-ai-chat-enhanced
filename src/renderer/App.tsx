import React, { useState } from "react";
import { ChatView } from "./components/ChatView";
import { ChatInput } from "./components/ChatInput";
import { StatusBar } from "./components/StatusBar";
import { ChatTurn } from "../shared/types/chat";
import "./index.css";

// ダミーデータ（モック）
const MOCK_MESSAGES: ChatTurn[] = [
  {
    role: "user",
    content: "Pythonのリスト内包表記について教えてください",
    timestamp: new Date().toISOString(),
  },
  {
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

  const handleSend = (text: string) => {
    // ユーザーのメッセージを追加
    const newUserMsg: ChatTurn = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    // AIの返答をシミュレート（1秒後）
    setTimeout(() => {
      const newAiMsg: ChatTurn = {
        role: "assistant",
        content: `「${text}」ですね。モック画面なのでダミーの回答を返しています。本番ではここにAPIからの回答が入ります。`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAiMsg]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>INIAD AI Chat Enhanced</h1>
        <button className="settings-button">⚙ 設定</button>
      </header>

      <main className="app-main">
        <ChatView messages={messages} />
      </main>

      <ChatInput onSend={handleSend} disabled={isLoading} />
      
      <StatusBar mcpStatus="connected" model="GPT-5.4-nano (Mock)" />
    </div>
  );
};

export default App;
