const db = require('../db');

const getUserByNIC = async (nic) => {
    try {
        console.log('Querying user with NIC:', nic);
        const query = `
            SELECT 
                id,
                name,
                email,
                address,
                phone_number,
                nic,
                points,
                created_at,
                updated_at
            FROM users 
            WHERE nic = ?
        `;
        
        const [rows] = await db.execute(query, [nic]);
        console.log('DB query result rows:', rows.length);

        if (rows.length === 0) {
            console.log('No user found with NIC:', nic);
            return null;
        }

        return rows[0];
    } catch (error) {
        console.error('Error in getUserByNIC:', error);
        throw error;
    }
};

module.exports = {
    getUserByNIC
}; 