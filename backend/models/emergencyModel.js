const db = require('../db');

const getActiveEmergencies = async () => {
    try {
        const query = `
            SELECT 
                emergency_id,
                user_id,
                type,
                time,
                severity,
                status,
                lon,
                lat,
                police_required,
                ambulance_required,
                repair_required,
                fire_service_required,
                CASE 
                    WHEN severity = 1 THEN 'Low'
                    WHEN severity = 2 THEN 'Medium'
                    WHEN severity = 3 THEN 'High'
                END as severity_level
            FROM emergency
            WHERE status IN ('unattended', 'ontheway')
            ORDER BY 
                CASE status
                    WHEN 'unattended' THEN 1
                    WHEN 'ontheway' THEN 2
                    ELSE 3
                END,
                severity DESC,
                time DESC
            LIMIT 1`;
        
        console.log('Executing emergency query'); // Debug log
        const [rows] = await db.execute(query);
        console.log('Query result:', rows); // Debug log
        return rows[0] || null;
    } catch (error) {
        console.error('Error in getActiveEmergencies:', error);
        throw error;
    }
};

const updateEmergencyStatus = async (emergencyId, status) => {
    try {
        const query = 'UPDATE emergency SET status = ? WHERE emergency_id = ?';
        const [result] = await db.execute(query, [status, emergencyId]);
        console.log('Update result:', result); // Debug log
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error in updateEmergencyStatus:', error);
        throw error;
    }
};

const createEmergency = async (emergencyData) => {
    try {
        const query = `
            INSERT INTO emergency (
                emergency_id, user_id, lon, lat, type, 
                time, severity, status, police_required, 
                ambulance_required, repair_required, 
                fire_service_required
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`;

        const values = [
            emergencyData.emergency_id,
            emergencyData.user_id,
            emergencyData.lon,
            emergencyData.lat,
            emergencyData.type,
            emergencyData.severity,
            'unattended',
            emergencyData.police_required,
            emergencyData.ambulance_required,
            emergencyData.repair_required,
            emergencyData.fire_service_required
        ];

        const [result] = await db.execute(query, values);
        console.log('Insert result:', result); // Debug log
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error in createEmergency:', error);
        throw error;
    }
};

const getRequiredServices = async (emergencyId) => {
    try {
        const query = `
            SELECT 
                police_required,
                ambulance_required,
                repair_required,
                fire_service_required
            FROM emergency
            WHERE emergency_id = ?`;
        
        const [rows] = await db.execute(query, [emergencyId]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching required services:', error);
        throw error;
    }
};

const getTodaysEmergencies = async () => {
    try {
        const query = `
            SELECT 
                emergency_id,
                user_id,
                type,
                time,
                severity,
                status,
                lon,
                lat,
                police_required,
                ambulance_required,
                repair_required,
                fire_service_required,
                CASE 
                    WHEN severity = 1 THEN 'Low'
                    WHEN severity = 2 THEN 'Medium'
                    WHEN severity = 3 THEN 'High'
                END as severity_level
            FROM emergency
            WHERE DATE(time) = CURDATE()
            ORDER BY 
                CASE status
                    WHEN 'unattended' THEN 1
                    WHEN 'ontheway' THEN 2
                    WHEN 'attended' THEN 3
                    ELSE 4
                END,
                severity DESC,
                time DESC`;
        
        console.log('Executing todays emergencies query'); // Debug log
        const [rows] = await db.execute(query);
        console.log('Query result:', rows); // Debug log
        return rows;
    } catch (error) {
        console.error('Error in getTodaysEmergencies:', error);
        throw error;
    }
};

module.exports = {
    getActiveEmergencies,
    updateEmergencyStatus,
    createEmergency,
    getRequiredServices,
    getTodaysEmergencies
}; 