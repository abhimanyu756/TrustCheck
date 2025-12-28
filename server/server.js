require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadRoutes = require('./routes/uploadRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrustCheck API is running');
});

app.use('/api/documents', uploadRoutes);
app.use('/api/verify', verificationRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
