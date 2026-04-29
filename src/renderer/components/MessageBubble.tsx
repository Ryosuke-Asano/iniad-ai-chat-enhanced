import React from "react";
import { ChatTurn, Citation } from "../../shared/types/chat";
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
        
        {!isUser && turn.citations && turn.citations.length > 0 && (
          <div className="citations-container">
            <div className="citations-header">📄 参照元:</div>
            <ul className="citations-list">
              {turn.citations.map((citation, index) => (
                <li key={index} className="citation-item">
                  <span className="citation-title">• {citation.title}</span>
                  <a href={citation.url} target="_blank" rel="noreferrer" className="citation-url">
                    {citation.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
