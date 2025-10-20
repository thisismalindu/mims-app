// src/lib/cron.js
import cron from 'node-cron';
import fetch from 'node-fetch';

// Run **once per month**: 00:05 on the 1st day
cron.schedule('5 0 1 * *', async () => {
  console.log('📅 Running automated monthly interest calculation...');
  try {
    const res = await fetch('http://localhost:3000/api/calc-savings-interest', {
      method: 'POST'
    });
    const data = await res.json();
    console.log('Interest Job Result:', data);
  } catch (err) {
    console.error('Error running interest job:', err);
  }
});
