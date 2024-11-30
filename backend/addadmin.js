const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const generateSaltAndHash = async (password) => {
  const salt = bcrypt.genSaltSync(10);
  const pepper = process.env.PEPPER;
  const pepperedPassword = password + pepper;
  const hashedPassword = bcrypt.hashSync(pepperedPassword, salt);
  return { hashedPassword, salt };
};

const addAdminUser = async () => {
  const email = 'mufli2mail@gmail.com';
  const password = 'admin'; 

  try {
    const { hashedPassword, salt } = await generateSaltAndHash(password);

    const query = `
      INSERT INTO admin_users (email, password_hash, salt, failed_attempts, last_login, updated_at, created_at)
      VALUES (?, ?, ?, 0, NULL, NOW(), NOW())
    `;

    connection.query(query, [email, hashedPassword, salt], (err, results) => {
      if (err) {
        console.error('Error inserting admin user:', err);
        return;
      }
      console.log('Admin user added successfully');
      console.log('User ID:', results.insertId);
    });
  } catch (error) {
    console.error('Error during user creation:', error);
  } finally {
    connection.end();
  }
};

addAdminUser();
