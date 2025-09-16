import React from "react";

const AgentSummary = () => {
  const agents = [
    { name: "Agent 1", transactions: 30 },
    { name: "Agent 2", transactions: 50 },
    { name: "Agent 3", transactions: 20 },
    { name: "Agent 4", transactions: 40 },
    { name: "Agent 5", transactions: 60 },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Agent Summary</h2>
      <ul>
        {agents.map((agent, index) => (
          <li key={index}>
            {agent.name}: {agent.transactions} transactions
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AgentSummary;
