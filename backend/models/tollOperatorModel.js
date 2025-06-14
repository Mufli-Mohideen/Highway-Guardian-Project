const db = require('../db');

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
      const query = `
        SELECT 
          t.id, t.user_id, t.password_hash, t.email, t.full_name, t.salt, 
          t.is_password_updated, t.status, t.last_login, t.toll_booth_id,
          b.location_name as toll_booth_location, b.lon as toll_booth_lon,
          b.lat as toll_booth_lat,
          d.profit_amount as today_profit,
          mt.target_amount as monthly_target,
          (
            SELECT COALESCE(SUM(dp.profit_amount), 0)
            FROM daily_profits dp
            WHERE dp.toll_booth_id = t.toll_booth_id
            AND YEAR(dp.date) = YEAR(CURDATE())
            AND MONTH(dp.date) = MONTH(CURDATE())
          ) as monthly_profit
        FROM tolloperators t
        LEFT JOIN tollbooths b ON t.toll_booth_id = b.id
        LEFT JOIN daily_profits d ON d.toll_booth_id = t.toll_booth_id 
          AND DATE(d.date) = CURDATE()
        LEFT JOIN monthlytargets mt ON mt.toll_booth_id = t.toll_booth_id
          AND mt.month = MONTH(CURDATE())
          AND mt.year = YEAR(CURDATE())
        WHERE t.user_id = ?`;
      
      const [rows] = await db.execute(query, [userId]);
      console.log('Toll operator details with profit calculations:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching toll operator details:', error);
      throw error;
    }
};

const getProfitData = async (userId) => {
  try {
    console.log('Fetching profit data for User ID:', userId);
    const query = `
      SELECT 
        d.profit_amount as today_profit,
        mt.target_amount as monthly_target,
        (
          SELECT COALESCE(SUM(dp.profit_amount), 0)
          FROM daily_profits dp
          WHERE dp.toll_booth_id = t.toll_booth_id
          AND YEAR(dp.date) = YEAR(CURDATE())
          AND MONTH(dp.date) = MONTH(CURDATE())
        ) as monthly_profit
      FROM tolloperators t
      LEFT JOIN daily_profits d ON d.toll_booth_id = t.toll_booth_id 
        AND DATE(d.date) = CURDATE()
      LEFT JOIN monthlytargets mt ON mt.toll_booth_id = t.toll_booth_id
        AND mt.month = MONTH(CURDATE())
        AND mt.year = YEAR(CURDATE())
      WHERE t.user_id = ?`;
    
    const [rows] = await db.execute(query, [userId]);
    console.log('Profit data:', rows[0]);
    return rows[0];
  } catch (error) {
    console.error('Error fetching profit data:', error);
    throw error;
  }
};

const getDetailedProfitReport = async (userId) => {
  try {
    console.log('Fetching detailed profit report for User ID:', userId);
    const query = `
      SELECT 
        DATE_FORMAT(d.date, '%Y-%m-%d') as date,
        d.profit_amount as daily_profit,
        t.toll_booth_id,
        b.location_name,
        mt.target_amount as monthly_target,
        (
          SELECT COUNT(*)
          FROM daily_profits dp
          WHERE dp.toll_booth_id = t.toll_booth_id
          AND DATE(dp.date) = DATE(d.date)
        ) as total_transactions
      FROM tolloperators t
      JOIN tollbooths b ON t.toll_booth_id = b.id
      LEFT JOIN daily_profits d ON d.toll_booth_id = t.toll_booth_id 
        AND d.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      LEFT JOIN monthlytargets mt ON mt.toll_booth_id = t.toll_booth_id
        AND mt.month = MONTH(d.date)
        AND mt.year = YEAR(d.date)
      WHERE t.user_id = ?
      ORDER BY d.date DESC`;
    
    const [rows] = await db.execute(query, [userId]);
    
    // Calculate additional statistics
    const stats = {
      totalProfit: rows.reduce((sum, row) => sum + (parseFloat(row.daily_profit) || 0), 0),
      averageDaily: rows.length > 0 ? rows.reduce((sum, row) => sum + (parseFloat(row.daily_profit) || 0), 0) / rows.length : 0,
      highestDaily: Math.max(...rows.map(row => parseFloat(row.daily_profit) || 0)),
      totalTransactions: rows.reduce((sum, row) => sum + (parseInt(row.total_transactions) || 0), 0),
      location: rows[0]?.location_name || 'N/A',
      monthlyTarget: rows[0]?.monthly_target || 0
    };

    return { dailyData: rows, statistics: stats };
  } catch (error) {
    console.error('Error fetching detailed profit report:', error);
    throw error;
  }
};

module.exports = {
    getTollOperatorByUserId,
    getTollOperatorDetailsById,
    getProfitData,
    getDetailedProfitReport
};
