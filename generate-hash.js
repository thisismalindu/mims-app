import bcrypt from "bcrypt";


const run = async (password) => {
  const hash = await bcrypt.hash(password, 10); // 10 = cost factor
console.log(`Hash for ${password}:`, hash);
};

run('mypassword');
