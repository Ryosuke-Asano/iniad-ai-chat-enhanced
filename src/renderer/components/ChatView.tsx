import React, { useRef, useEffect } from "react";
import { ChatTurn } from "../../shared/types/chat";
import { MessageBubble } from "./MessageBubble";
import "../index.css";

interface ChatViewProps {
  messages: ChatTurn[];
}

export const ChatView: React.FC<ChatViewProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // スクロールを一番下へ移動
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-view-container">
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <p>質問を入力して会話を始めましょう</p>
        </div>
      ) : (
        messages.map((msg, index) => (
          <MessageBubble key={index} turn={msg} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};
