import React from "react";
import { Citation } from "../../shared/types/chat";
import "../index.css";

interface CitationPanelProps {
  citations: Citation[];
}

export const CitationPanel: React.FC<CitationPanelProps> = ({ citations }) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="citations-container">
      <div className="citations-header">📄 参照元:</div>
      <ul className="citations-list">
        {citations.map((citation, index) => (
          <li key={index} className="citation-item">
            <span className="citation-title">• {citation.title}</span>
            <a href={citation.url} target="_blank" rel="noreferrer" className="citation-url">
              {citation.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
