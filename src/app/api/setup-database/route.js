import { query } from '@/lib/database';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    console.log('Starting database setup...');

    // Correct path to schema file
    const sqlFilePath = "./src/app/api/setup-database/database-schema.sql";
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    console.log('SQL file read successfully.');

    // Split into individual statements
    const sqlStatements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Start transaction
    await query('BEGIN');
    try {
      for (const statement of sqlStatements) {
        await query(statement);
        console.log('Executed SQL statement:', statement.substring(0, 80) + '...');
      }
      await query('COMMIT');
      console.log('Database setup completed successfully.');

      return Response.json({
        success: true,
        message: 'Database setup complete! Tables created and initial data loaded.'
      });
    } catch (err) {
      console.error('Error during SQL execution, rolling back...', err);
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Database setup failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}