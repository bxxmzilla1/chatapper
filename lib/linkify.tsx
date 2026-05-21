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
          className="break-all font-semibold"
          style={{
            color: "#ffffff",
            textDecoration: "underline",
            textDecorationColor: "rgba(255,255,255,0.7)",
            textUnderlineOffset: "3px",
            textDecorationThickness: "1.5px",
          }}
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
