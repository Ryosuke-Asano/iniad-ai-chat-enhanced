import React from "react";
import { ChatTurn } from "../../shared/types/chat";
import { CitationPanel } from "./CitationPanel";


interface MessageBubbleProps {
  turn: ChatTurn;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ turn }) => {
  const isUser = turn.role === "user";

  return (
    <div className={`message-bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar">
        {isUser ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
        )}
      </div>
      <div className="message-body">
        <div className="message-sender-name">
          {isUser ? "あなた" : "AI アシスタント"}
        </div>
        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
          <p className="message-content">{turn.content}</p>
          
          {!isUser && <CitationPanel citations={turn.citations || []} />}
        </div>
      </div>
    </div>
  );
};
