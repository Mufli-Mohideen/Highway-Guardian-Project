const { getUserByNIC: getUserByNICFromModel } = require('../models/userModel');

const getUserByNIC = async (req, res) => {
    try {
        const { nic } = req.params;

        if (!nic) {
            return res.status(400).json({
                success: false,
                message: 'NIC is required'
            });
        }

        const user = await getUserByNICFromModel(nic);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'User details retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Error in getUserByNIC controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getUserByNIC
}; 