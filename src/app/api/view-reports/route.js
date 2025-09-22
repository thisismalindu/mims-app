export async function POST(request) {
    try {
        const data = await request.json();
        // Process the data as needed
        return new Response(JSON.stringify({ message: 'Data received', data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}