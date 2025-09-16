import React from "react";

const FixedDepositSummary = () => {
  const activeFds = [
    { id: 1, amount: "LKR 500,000", nextPayout: "2025-09-15" },
    { id: 2, amount: "LKR 1,000,000", nextPayout: "2025-10-15" },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Fixed Deposit Summary</h2>
      <ul>
        {activeFds.map((fd, index) => (
          <li key={index}>
            FD ID {fd.id}: {fd.amount} - Next Payout: {fd.nextPayout}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FixedDepositSummary;
