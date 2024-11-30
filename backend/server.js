const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./routes/adminRoutes');
const tolloperatorRoutes = require('./routes/tollOperatorRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;


app.use(express.json());
app.use(cors());


app.use('/admin', adminRoutes);
app.use('/tolloperator',tolloperatorRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
