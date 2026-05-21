import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

/**
 * Splits text on URLs and wraps each URL in a clickable <a> tag
 * that opens in a new tab.
 */
export function linkifyText(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // Reset lastIndex after test()
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all"
          style={{ color: "var(--accent-light)" }}
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    URL_REGEX.lastIndex = 0;
    return part;
  });
}
