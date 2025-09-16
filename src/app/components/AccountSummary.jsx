import React from "react";

const AccountSummary = () => {
  const accountTypes = {
    children: 50,
    teen: 150,
    adult: 300,
    senior: 50,
    joint: 30,
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Account Summary</h2>
      <p>Children Accounts: {accountTypes.children}</p>
      <p>Teen Accounts: {accountTypes.teen}</p>
      <p>Adult Accounts: {accountTypes.adult}</p>
      <p>Senior Accounts: {accountTypes.senior}</p>
      <p>Joint Accounts: {accountTypes.joint}</p>
    </div>
  );
};

export default AccountSummary;
