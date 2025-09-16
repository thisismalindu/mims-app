import React from "react";

function TransactionCard({ transaction }) {
  return (
    <div className="transaction-card">
      <p>{transaction.time}</p>
      <p>{transaction.customer}</p>
      <p>{transaction.type}</p>
      <p>{transaction.amount} Rs</p>
    </div>
  );
}

export default TransactionCard;
