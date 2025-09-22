import bcrypt from "bcrypt";

const run = async (password) => {
  const hash = await bcrypt.hash(password, 10); // 10 = cost factor
  console.log(`Hash for ${password}:`, hash);
};

// Get password from command line arguments
const [, , password] = process.argv;

if (!password) {
  console.log("Usage: node generate-hash.js <password>");
  process.exit(1);
}

run(password);
