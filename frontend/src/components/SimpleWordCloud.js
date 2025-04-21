import React from "react";

const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];

const SimpleWordCloud = ({ words }) => {
  if (!Array.isArray(words) || words.length === 0) {
    return <p>⚠️ 暂无关键词可显示</p>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {words.map((word, index) => {
        const size = 14 + (word.value || 10); // 基础字号
        const color = colors[index % colors.length];

        return (
          <span
            key={index}
            style={{
              fontSize: `${size}px`,
              color,
              fontWeight: "bold",
              transform: `rotate(${(index % 2 === 0 ? 0 : 10)}deg)`
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

export default SimpleWordCloud;
