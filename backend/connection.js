const db = require('./db');

const testQuery = async () => {
    try {
        const [rows] = await db.execute('SELECT 1');
        console.log('Database connection is working:', rows);
    } catch (error) {
        console.error('Database connection test failed:', error);
    }
};

testQuery();
