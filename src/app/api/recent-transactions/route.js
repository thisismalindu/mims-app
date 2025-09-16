export async function GET(request) {
    // Example: Fetch recent transactions from a data source
    // Replace this with your actual data fetching logic
    const recentTransactions = [
        { id: 1, amount: 100, date: '2024-06-01' },
        { id: 2, amount: 50, date: '2024-06-02' },
    ];

    return new Response(JSON.stringify(recentTransactions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}