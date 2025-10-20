// src/lib/cron.js
import cron from 'node-cron';

// Only run cron jobs on the server side
if (typeof window === 'undefined') {
  // Run **once per month**: 00:05 on the 1st day
  cron.schedule('5 0 1 * *', async () => {
    console.log('📅 Running automated monthly interest calculation...');
    
    try {
      // Process savings account interest
      console.log('💰 Processing savings account interest...');
      const savingsRes = await fetch('http://localhost:3000/api/calc-savings-interest', {
        method: 'POST',
        headers: {
          'X-Cron-Secret': process.env.CRON_SECRET || 'internal-cron-job'
        }
      });
      const savingsData = await savingsRes.json();
      console.log('Savings Interest Job Result:', savingsData);
    } catch (err) {
      console.error('Error running savings interest job:', err);
    }

    try {
      // Process FD interest
      console.log('💎 Processing fixed deposit interest...');
      const fdRes = await fetch('http://localhost:3000/api/process-fd-interest', {
        method: 'POST',
        headers: {
          'X-Cron-Secret': process.env.CRON_SECRET || 'internal-cron-job'
        }
      });
      const fdData = await fdRes.json();
      console.log('FD Interest Job Result:', fdData);
    } catch (err) {
      console.error('Error running FD interest job:', err);
    }
  });

  console.log('✅ Cron jobs initialized: Monthly interest processing scheduled for 1st day at 00:05');
}
