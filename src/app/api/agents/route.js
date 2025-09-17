import bcrypt from 'bcrypt';
const { name, email, password, branch_id } = await request.json();
const passwordHash = await bcrypt.hash(password, 10); // 10 is the "salt rounds"

await query(
  'INSERT INTO agents (name, email, password_hash, branch_id) VALUES ($1, $2, $3, $4)',
  [name, email, passwordHash, branch_id]
);