// src/components/EmotionPieChart.js
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const EmotionPieChart = ({ data }) => {
  if (!data) return <p>No emotion data.</p>;

  const labels = Object.keys(data);
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4caf50", "#9966ff"],
        borderWidth: 1,
      },
    ],
  };

  return <Pie data={chartData} />;
};

export default EmotionPieChart;
