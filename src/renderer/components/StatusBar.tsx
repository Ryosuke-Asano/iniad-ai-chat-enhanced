import React from "react";

interface StatusBarProps {
  mcpStatus: "connected" | "disconnected" | "connecting";
  model: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ mcpStatus, model }) => {
  const statusDot = (
    <svg width="10" height="10" viewBox="0 0 10 10" className={`status-indicator ${mcpStatus}`}>
      <circle cx="5" cy="5" r="5" fill="currentColor" />
    </svg>
  );

  const getStatusIndicator = () => statusDot;

  const getStatusText = () => {
    switch (mcpStatus) {
      case "connected":
        return "MCP接続済み";
      case "connecting":
        return "MCP接続中...";
      case "disconnected":
      default:
        return "MCP未接続";
    }
  };

  return (
    <div className="status-bar">
      <div className="status-item">
        {getStatusIndicator()}
        <span className="status-text">{getStatusText()}</span>
      </div>
      <div className="status-divider">|</div>
      <div className="status-item">
        <span className="status-text">モデル: {model}</span>
      </div>
    </div>
  );
};
