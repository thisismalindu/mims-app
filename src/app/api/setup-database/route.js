export async function GET(request) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Setup Database</title>
      </head>
      <body>
        <h1>Database Setup</h1>
        <p>
          To setup the database, please run the setup script via the backend Node.js server.<br>
          This operation cannot be performed by accessing this URL.
        </p>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}