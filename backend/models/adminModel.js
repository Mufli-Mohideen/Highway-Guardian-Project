const db = require('../../backend/db');

const getAdminById = async (id) => {
    try {
        console.log('Querying admin user with ID:', id);
        const result = await db.execute('SELECT * FROM admin_users WHERE id = ?', [id]);
        console.log('DB query raw result:', result);

        if (!result || result.length === 0) {
            console.error('No data returned from the database.');
            return null;
        }

        const rows = result[0];
        if (rows.length === 0) {
            console.error('No matching admin user found.');
            return null;
        }

        return rows[0];
    } catch (error) {
        console.error('Error in getAdminById:', error);
        throw error;
    }
};


module.exports = { getAdminById };
