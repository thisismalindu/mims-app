import React from "react";

const TransactionSummary = () => {
  const totalTransactions = 100; // Example data
  const totalDeposits = "LKR 4.5M";
  const totalWithdrawals = "LKR 1.2M";

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Transaction Summary</h2>
      <p>Total Transactions: {totalTransactions}</p>
      <p>Total Deposits: {totalDeposits}</p>
      <p>Total Withdrawals: {totalWithdrawals}</p>
    </div>
  );
};

export default TransactionSummary;
