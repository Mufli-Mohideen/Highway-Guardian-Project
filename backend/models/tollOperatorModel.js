const db = require('../../backend/db');

const getTollOperatorByUserId = async (user_id) => {
    try {
        console.log('Querying toll operator with User ID:', user_id);
        const result = await db.execute('SELECT * FROM tolloperators WHERE user_id = ?', [user_id]);
        console.log('DB query raw result:', result);

        if (!result || result.length === 0) {
            console.error('No data returned from the database.');
            return null;
        }

        const rows = result[0];
        if (rows.length === 0) {
            console.error('No matching toll operator found.');
            return null;
        }

        return rows[0];
    } catch (error) {
        console.error('Error in getTollOperatorByUserId:', error);
        throw error;
    }
};

const getTollOperatorDetailsById = async (userId) => {
    try {
      console.log('Fetching toll operator details for User ID:', userId);
      const query = 'SELECT id, user_id, password_hash, email, full_name, salt, is_password_updated, status, last_login FROM tolloperators WHERE user_id = ?';
      const [rows] = await db.execute(query, [userId]);
      console.log('Toll operator details:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching toll operator details:', error);
      throw error;
    }
};

module.exports = {
    getTollOperatorByUserId,
    getTollOperatorDetailsById
};
