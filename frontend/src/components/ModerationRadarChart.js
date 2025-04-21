// src/components/ModerationRadarChart.js
import React from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ModerationRadarChart = ({ data }) => {
  if (!data) return <p>No moderation data.</p>;

  // 固定的六个维度
  const fixedLabels = [
    "hate_speech",
    "offensive_speech",
    "misinformation",
    "political_bias",
    "violence",
    "harassment"
  ];

  // 按顺序取值，缺失项设为 0
  const values = fixedLabels.map((key) => data[key] ?? 0);

  const chartData = {
    labels: fixedLabels,
    datasets: [
      {
        label: "Toxicity Scores",
        data: values,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  return <Radar data={chartData} />;
};

export default ModerationRadarChart;
