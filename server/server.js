require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadRoutes = require('./routes/uploadRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrustCheck API is running');
});

app.use('/api/documents', uploadRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
