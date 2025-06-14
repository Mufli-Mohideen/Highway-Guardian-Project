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

const updateUserPoints = async (nic, topupAmount) => {
    try {
        console.log('Updating points for user with NIC:', nic, 'Amount:', topupAmount);
        
        // First, get the current user data
        const user = await getUserByNIC(nic);
        if (!user) {
            throw new Error('User not found');
        }

        const currentPoints = parseFloat(user.points) || 0;
        const newPoints = currentPoints + parseFloat(topupAmount);

        // Update the user points
        const updateQuery = `
            UPDATE users 
            SET points = ?, updated_at = NOW() 
            WHERE nic = ?
        `;
        
        const [result] = await db.execute(updateQuery, [newPoints, nic]);
        console.log('Points update result:', result);

        if (result.affectedRows === 0) {
            throw new Error('Failed to update user points');
        }

        // Return the updated user data
        return await getUserByNIC(nic);
    } catch (error) {
        console.error('Error in updateUserPoints:', error);
        throw error;
    }
};

module.exports = {
    getUserByNIC,
    updateUserPoints
}; 