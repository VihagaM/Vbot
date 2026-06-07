const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const commands = require('../bot/commands');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// ─── Shared State ─────────────────────────────────────────────────────────────
const whatsappState = {
  isReady: false,
  qr: null,
  pairingCode: null
};

// ─── Message + Image Logs ─────────────────────────────────────────────────────
// FIX: Declare these BEFORE the event listeners that reference them.
const messageLogs = [];   // stores last 100 messages
const oneTimeImages = {}; // { [msgId]: { data: 'data:image/jpeg;base64,...', from, timestamp } }

// ─── QR / Auth Events ─────────────────────────────────────────────────────────
client.on('qr', async (qr) => {
  console.log('\n📱 New QR code generated. Updating state...');
  try {
    whatsappState.qr = await QRCode.toDataURL(qr);
  } catch (err) {
    console.error('Failed to convert QR to Data URL:', err);
  }

  try {
    const phone = process.env.BOT_PHONE_NUMBER;
    if (phone) {
      const code = await client.requestPairingCode(phone);
      whatsappState.pairingCode = code;
      console.log('📲 Pairing code:', code);
    }
  } catch (err) {
    console.error('Failed to get pairing code:', err.message);
  }
});

client.on('ready', () => {
  console.log('✅ Bot is online and ready!');
  whatsappState.isReady = true;
  whatsappState.qr = null;
});

client.on('auth_failure', () => {
  console.log('❌ Authentication failed. Delete the .wwebjs_auth folder.');
});

client.on('disconnected', (reason) => {
  console.log('🔌 Bot disconnected:', reason);
  whatsappState.isReady = false;
});

// ─── Message Handler ──────────────────────────────────────────────────────────
client.on('message_create', async (msg) => {
  const body = (msg.body || '').trim();

  // ── Build the log entry ──
  const logEntry = {
    id: msg.id.id,
    from: msg.from,
    body: body,
    timestamp: new Date().toLocaleTimeString(),
    type: msg.type,       // 'chat', 'image', 'video', 'document', etc.
    hasMedia: msg.hasMedia,
    mediaData: null,      // will be filled below for images
    isViewOnce: msg.isViewOnce || false
  };

  // ── If the message carries an image, download it and embed as base64 ──
  if (msg.hasMedia && (msg.type === 'image' || msg.type === 'sticker')) {
    try {
      const media = await msg.downloadMedia();
      if (media) {
        const dataUrl = `data:${media.mimetype};base64,${media.data}`;
        logEntry.mediaData = dataUrl;

        // If it is a one-time-view (view-once) image, stash it separately
        // so .reveal can retrieve it later.
        if (msg.isViewOnce) {
          oneTimeImages[msg.id.id] = {
            data: dataUrl,
            from: msg.from,
            timestamp: new Date().toLocaleTimeString()
          };
          console.log(`👁️ One-time image stored: ${msg.id.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to download media:', err.message);
    }
  }

  messageLogs.push(logEntry);
  if (messageLogs.length > 100) messageLogs.shift();

  // ── Command router ──
  if (!body.startsWith('.')) return;

  const [command, ...args] = body.slice(1).split(' ');
  const cmd = command.toLowerCase();

  try {
    if (commands[cmd]) {
      await commands[cmd](client, msg, args);
    } else {
      await msg.reply(`❓ Unknown command. Type *.menu* to see options.`);
    }
  } catch (err) {
    console.error(`Error in command .${cmd}:`, err.message);
    await msg.reply('⚠️ An error occurred while running that command.');
  }
});

module.exports = { client, whatsappState, messageLogs, oneTimeImages };