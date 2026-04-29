import React from "react";
import { ChatTurn } from "../../shared/types/chat";
import { CitationPanel } from "./CitationPanel";
import "../index.css";

interface MessageBubbleProps {
  turn: ChatTurn;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ turn }) => {
  const isUser = turn.role === "user";

  return (
    <div className={`message-bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      <div className="message-sender-name">
        {isUser ? "[User]" : "[AI]"}
      </div>
      <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
        <p className="message-content">{turn.content}</p>
        
        {!isUser && <CitationPanel citations={turn.citations || []} />}
      </div>
    </div>
  );
};
