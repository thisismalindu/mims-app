'use client';

import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Charts({ type }) {
  const pieData = {
    labels: ['Savings', 'Current', 'Fixed Deposit'],
    datasets: [
      {
        label: 'Account Types',
        data: [1200, 700, 400],
        backgroundColor: ['#60a5fa', '#34d399', '#fbbf24'],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June','july','aug','sep','oct','nov','dec'],
    datasets: [
      {
        label: 'Transaction Volume (Rs)',
        data: [500000, 650000, 700000, 600000, 750000, 900000,40000,300000,250000,450000,309993,345000],
        backgroundColor: '#4f46e5',
      },
    ],
  };

  const barOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (type === 'pie') {
    return <Pie data={pieData} />;
  }

  if (type === 'bar') {
    return <Bar data={barData} options={barOptions} />;
  }

  return null; // Fallback if no valid type is passed
}
