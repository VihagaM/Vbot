const express = require('express');
const router = express.Router();
const { client, whatsappState, messageLogs } = require('../config/whatsapp');
const QRCode = require('qrcode');

// GET /api/status
router.get('/status', (req, res) => {
  res.json({
    server: 'online',
    whatsapp: whatsappState.isReady ? 'connected' : 'connecting/disconnected'
  });
});

router.get('/qr', (req, res) => {
  if (whatsappState.qr) {
    res.json({ qr: whatsappState.qr });
  } else {
    res.status(404).json({ error: 'QR code not available.' });
  }
});



// POST /api/send-message
router.post('/request-pairing-code', async (req, res) => {
  const { phone } = req.body; // e.g. "94771234567"

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  try {
    const code = await client.requestPairingCode(phone);
    whatsappState.pairingCode = code;
    res.json({ pairingCode: code });
  } catch (err) {
    console.error('Pairing code error:', err.message);
    res.status(500).json({ error: 'Failed to get pairing code.' });
  }
});

router.post('/send-message', async (req, res) => {
  const { to, message } = req.body;

  if (!whatsappState.isReady) {
    return res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
  }

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message" payload.' });
  }

  try {
    const formattedNumber = to.includes('@c.us') ? to : `${to.replace(/[^0-9]/g, '')}@c.us`;
    await client.sendMessage(formattedNumber, message);
    
    res.json({ success: true, message: `Sent to ${formattedNumber}` });
  } catch (error) {
    console.error('Failed to send API message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// NEW LINK: GET /api/messages
router.get('/messages', (req, res) => {
  // Returns historical array data sorted by newest first
  res.json([...messageLogs].reverse());
});

module.exports = router;