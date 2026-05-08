import React from "react";


interface StatusBarProps {
  mcpStatus: "connected" | "disconnected" | "connecting";
  model: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ mcpStatus, model }) => {
  const getStatusIndicator = () => {
    switch (mcpStatus) {
      case "connected":
        return <span className="status-indicator connected">●</span>;
      case "connecting":
        return <span className="status-indicator connecting">●</span>;
      case "disconnected":
      default:
        return <span className="status-indicator disconnected">●</span>;
    }
  };

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
