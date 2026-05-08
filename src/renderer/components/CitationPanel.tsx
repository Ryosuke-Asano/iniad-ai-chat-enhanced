import React from "react";
import { Citation } from "../../shared/types/chat";


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
        {citations.map((citation) => (
          <li key={citation.url} className="citation-item">
            <span className="citation-title">• {citation.title}</span>
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-url">
              {citation.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
