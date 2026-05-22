import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

/**
 * Splits text on URLs and wraps each URL in a clickable <a> tag
 * that opens in a new tab.
 * Pass darkBg=true when rendering on a light/yellow background (user bubble).
 */
export function linkifyText(text: string, darkBg = false): React.ReactNode {
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
            color: darkBg ? "rgba(0,0,0,0.75)" : "#ffffff",
            textDecoration: "underline",
            textDecorationColor: darkBg ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)",
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
