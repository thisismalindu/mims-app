export async function POST(request) {
    try {
        const data = await request.json();
        // Process the data or initiate transaction logic here

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}