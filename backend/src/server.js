const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');
const { client } = require('./config/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);



// Initialize WhatsApp
client.initialize();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express backend running on port ${PORT}`);
});