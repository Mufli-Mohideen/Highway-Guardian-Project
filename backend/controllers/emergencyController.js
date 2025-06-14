const emergencyModel = require('../models/emergencyModel');

// Get active emergency
const getActiveEmergency = async (req, res) => {
    try {
        console.log('Fetching active emergency'); // Debug log
        
        const emergency = await emergencyModel.getActiveEmergencies();
        console.log('Retrieved emergency:', emergency); // Debug log

        if (!emergency) {
            return res.json({ 
                hasActiveEmergency: false,
                message: 'No active emergencies'
            });
        }

        // Format the response
        const response = {
            hasActiveEmergency: true,
            emergency: {
                id: emergency.emergency_id,
                location: `${emergency.lat}, ${emergency.lon}`,
                type: emergency.type,
                timeReported: emergency.time,
                severity: emergency.severity_level,
                status: emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1),
                requiredServices: {
                    police: emergency.police_required === 1,
                    ambulance: emergency.ambulance_required === 1,
                    repair: emergency.repair_required === 1,
                    fireService: emergency.fire_service_required === 1
                }
            }
        };

        console.log('Sending response:', response); // Debug log
        res.json(response);
    } catch (error) {
        console.error('Error in getActiveEmergency:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Update emergency status
const updateStatus = async (req, res) => {
    try {
        const { emergencyId, status } = req.body;
        console.log('Updating status:', { emergencyId, status }); // Debug log
        
        if (!['unattended', 'ontheway', 'attended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updated = await emergencyModel.updateEmergencyStatus(emergencyId, status);
        
        if (!updated) {
            return res.status(404).json({ message: 'Emergency not found or status not updated' });
        }

        res.json({ message: 'Emergency status updated successfully' });
    } catch (error) {
        console.error('Error in updateStatus:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Get today's emergencies
const getTodaysEmergencies = async (req, res) => {
    try {
        console.log('Fetching todays emergencies'); // Debug log
        
        const emergencies = await emergencyModel.getTodaysEmergencies();
        console.log('Retrieved emergencies:', emergencies); // Debug log

        // Format the response
        const formattedEmergencies = emergencies.map(emergency => ({
            id: emergency.emergency_id,
            userId: emergency.user_id,
            location: `${emergency.lat}, ${emergency.lon}`,
            type: emergency.type,
            timeReported: emergency.time,
            severity: emergency.severity_level,
            status: emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1).replace('ontheway', 'On the Way'),
            requiredServices: {
                police: emergency.police_required === 1,
                ambulance: emergency.ambulance_required === 1,
                repair: emergency.repair_required === 1,
                fireService: emergency.fire_service_required === 1
            }
        }));

        console.log('Sending response:', formattedEmergencies); // Debug log
        res.json({ 
            emergencies: formattedEmergencies,
            count: formattedEmergencies.length 
        });
    } catch (error) {
        console.error('Error in getTodaysEmergencies:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Export the functions directly
module.exports = {
    getActiveEmergency,
    updateStatus,
    getTodaysEmergencies
}; 