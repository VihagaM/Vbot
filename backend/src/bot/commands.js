const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── Helper ───────────────────────────────────────────────────────────────────
const checkIsGroup = async (msg) => {
  const chat = await msg.getChat();
  return chat.isGroup;
};

// ─────────────────────────────────────────────────────────────────────────────
//  .menu
// ─────────────────────────────────────────────────────────────────────────────
exports.menu = async (client, msg, args) => {
  try {
    const chat = await msg.getChat();
    const mediaPath = path.join(__dirname, '../assets/menu.png');

    if (!fs.existsSync(mediaPath)) {
      console.warn(`⚠️ Warning: Menu image not found at ${mediaPath}. Sending text only.`);
    }

    const media = fs.existsSync(mediaPath) ? MessageMedia.fromFilePath(mediaPath) : null;

    const menu = `
╭━━━ 🤖 BOT MENU ━━━━╮

┃ 📋 *INFO COMMANDS*
┃ • .menu      → Show menu
┃ • .ping      → Check speed
┃ • .info      → Group info
┃ • .owner     → Owner info
┃ • .alive     → Bot status
┃ • .id        → Get chat ID
┃ • .runtime   → Uptime

┣━━━━━━━━━━━━━━━

┃ 🎵 *MUSIC COMMANDS*
┃ • .song      → Search song
┃ • .lyrics    → Get lyrics

┣━━━━━━━━━━━━━━━

┃ 👥 *GROUP COMMANDS*
┃ • .kick      → Kick member
┃ • .add       → Add member
┃ • .promote   → Make admin
┃ • .demote    → Remove admin
┃ • .mute      → Mute group
┃ • .unmute    → Unmute group
┃ • .tagall    → Tag everyone

┣━━━━━━━━━━━━━━━

┃ 🛠️ *UTILITY*
┃ • .weather   → Get weather
┃ • .calc      → Calculator
┃ • .joke      → Random joke
┃ • .quote     → Random quote
┃ • .reveal    → Reveal view-once image

╰━━━━━━━━━━━━━━━╯
`.trim();

    if (media) {
      await client.sendMessage(chat.id._serialized, media, { caption: menu });
    } else {
      await client.sendMessage(chat.id._serialized, menu);
    }
  } catch (err) {
    console.error('Error generating menu:', err);
    await msg.reply('⚠️ An error occurred while opening the menu.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .ping
// ─────────────────────────────────────────────────────────────────────────────
exports.ping = async (client, msg, args) => {
  const chat = await msg.getChat();
  const start = Date.now();
  await msg.reply('🏓 Pong!');
  const latency = Date.now() - start;
  await client.sendMessage(chat.id._serialized, `⚡ Speed: *${latency}ms*`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .alive
// ─────────────────────────────────────────────────────────────────────────────
exports.alive = async (client, msg, args) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const aliveMsg = `
🟢 *Bot is Alive!*

✅ Status: *Online*
⏱️ Uptime: *${hours}h ${minutes}m ${seconds}s*
🧠 Memory: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB*
📅 Date: *${new Date().toLocaleDateString()}*
🕐 Time: *${new Date().toLocaleTimeString()}*
  `.trim();

  await msg.reply(aliveMsg);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .runtime
// ─────────────────────────────────────────────────────────────────────────────
exports.runtime = async (client, msg, args) => {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  await msg.reply(`⏱️ *Bot Runtime*\n\n🕐 ${days}d ${hours}h ${minutes}m ${seconds}s`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .song
// ─────────────────────────────────────────────────────────────────────────────
exports.song = async (client, msg, args) => {
  if (!args.length) return msg.reply('🎵 Usage: *.song <song name>*\nExample: *.song Blinding Lights*');

  const query = args.join(' ');
  const chat = await msg.getChat();
  await msg.reply(`🔍 Searching for *${query}*...`);

  try {
    const ytLink = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
    await client.sendMessage(chat.id._serialized, `🎵 *${query}*\n\n🔗 Search result:\n${ytLink}\n\n💡 _Tip: Use a YouTube downloader bot or site to get the audio file._`);
  } catch (e) {
    await msg.reply('❌ Could not fetch song. Try again later.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .lyrics
// ─────────────────────────────────────────────────────────────────────────────
exports.lyrics = async (client, msg, args) => {
  if (!args.length) return msg.reply('🎤 Usage: *.lyrics <artist> - <song>*\nExample: *.lyrics The Weeknd - Blinding Lights*');

  const input = args.join(' ');
  const parts = input.split(' - ');

  if (parts.length < 2) {
    return msg.reply('🎤 Please use the format: *.lyrics <artist> - <song>*');
  }

  const artist = parts[0].trim();
  const title = parts.slice(1).join(' - ').trim();
  const chat = await msg.getChat();

  await msg.reply(`🔍 Fetching lyrics for *${title}* by *${artist}*...`);

  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 8000 });
    const lyrics = res.data.lyrics;

    if (!lyrics) return msg.reply('❌ No lyrics found.');

    const trimmed = lyrics.length > 3500
      ? lyrics.slice(0, 3500) + '\n\n... _(lyrics trimmed)_'
      : lyrics;

    await client.sendMessage(chat.id._serialized, `🎤 *${title}* — ${artist}\n\n${trimmed}`);
  } catch (e) {
    await msg.reply('❌ Lyrics not found. Check the artist/song name and try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .tts
// ─────────────────────────────────────────────────────────────────────────────
exports.tts = async (client, msg, args) => {
  if (!args.length) return msg.reply('🔊 Usage: *.tts <text>*');

  const text = args.join(' ');
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

  try {
    await msg.reply(`🔊 Generating TTS for: _${text}_\n\n🔗 ${ttsUrl}`);
  } catch (e) {
    await msg.reply('❌ TTS failed.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .tr <lang> <text>
// ─────────────────────────────────────────────────────────────────────────────
exports.tr = async (client, msg, args) => {
  if (args.length < 2) return msg.reply('🌐 Usage: *.tr <lang code> <text>*\nExample: *.tr es Hello World*');

  const lang = args[0];
  const text = args.slice(1).join(' ');
  const chat = await msg.getChat();

  try {
    const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`, { timeout: 8000 });
    const translated = res.data.responseData.translatedText;

    await client.sendMessage(chat.id._serialized, `🌐 *Translation (en → ${lang})*\n\n📝 Original: _${text}_\n✅ Translated: *${translated}*`);
  } catch (e) {
    await msg.reply('❌ Translation failed. Check the language code.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .weather
// ─────────────────────────────────────────────────────────────────────────────
exports.weather = async (client, msg, args) => {
  if (!args.length) return msg.reply('🌤️ Usage: *.weather <city>*\nExample: *.weather Colombo*');

  const city = args.join(' ');
  const chat = await msg.getChat();

  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 8000 });
    const data = res.data.trim();

    await client.sendMessage(chat.id._serialized, `🌤️ *Weather: ${city}*\n\n${data}\n\n🔗 Full report: https://wttr.in/${encodeURIComponent(city)}`);
  } catch (e) {
    await msg.reply('❌ Could not fetch weather. Check the city name.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .calc
// ─────────────────────────────────────────────────────────────────────────────
exports.calc = async (client, msg, args) => {
  if (!args.length) return msg.reply('🧮 Usage: *.calc <expression>*\nExample: *.calc 25 * 4 + 10*');

  const expr = args.join(' ');
  const chat = await msg.getChat();

  try {
    const sanitized = expr.replace(/[^0-9+\-*/.() %]/g, '');
    if (!sanitized) return msg.reply('❌ Invalid expression.');

    const result = Function(`"use strict"; return (${sanitized})`)();

    if (typeof result !== 'number' || !isFinite(result)) {
      return msg.reply('❌ Invalid calculation.');
    }

    await client.sendMessage(chat.id._serialized, `🧮 *Calculator*\n\n📝 Input: \`${expr}\`\n✅ Result: *${result}*`);
  } catch (e) {
    await msg.reply('❌ Could not calculate. Check your expression.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .8ball
// ─────────────────────────────────────────────────────────────────────────────
exports['8ball'] = async (client, msg, args) => {
  if (!args.length) return msg.reply('🎱 Usage: *.8ball <your question>*');

  const responses = [
    '✅ It is certain.', '✅ It is decidedly so.', '✅ Without a doubt.', '✅ Yes, definitely.',
    '🤷 Reply hazy, try again.', '🤷 Ask again later.', '🤷 Cannot predict now.',
    '❌ Don\'t count on it.', '❌ My reply is no.', '❌ Very doubtful.'
  ];

  const question = args.join(' ');
  const answer = responses[Math.floor(Math.random() * responses.length)];
  const chat = await msg.getChat();

  await client.sendMessage(chat.id._serialized, `🎱 *Magic 8 Ball*\n\n❓ _${question}_\n\n${answer}`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .joke
// ─────────────────────────────────────────────────────────────────────────────
exports.joke = async (client, msg, args) => {
  const chat = await msg.getChat();
  try {
    const res = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 8000 });
    const { setup, punchline } = res.data;

    await client.sendMessage(chat.id._serialized, `😂 *Random Joke*\n\n${setup}\n\n||${punchline}||`);
  } catch (e) {
    const fallback = [{ s: "Why don't scientists trust atoms?", p: 'Because they make up everything!' }];
    const j = fallback[Math.floor(Math.random() * fallback.length)];
    await client.sendMessage(chat.id._serialized, `😂 *Random Joke*\n\n${j.s}\n\n_${j.p}_`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .quote
// ─────────────────────────────────────────────────────────────────────────────
exports.quote = async (client, msg, args) => {
  const chat = await msg.getChat();
  try {
    const res = await axios.get('https://api.quotable.io/random', { timeout: 8000 });
    const { content, author } = res.data;

    await client.sendMessage(chat.id._serialized, `💬 *Quote of the Moment*\n\n_"${content}"_\n\n— *${author}*`);
  } catch (e) {
    const fallback = [{ q: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' }];
    const qt = fallback[Math.floor(Math.random() * fallback.length)];
    await client.sendMessage(chat.id._serialized, `💬 *Quote of the Moment*\n\n_"${qt.q}"_\n\n— *${qt.a}*`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .remind
// ─────────────────────────────────────────────────────────────────────────────
exports.remind = async (client, msg, args) => {
  if (args.length < 2) return msg.reply('⏰ Usage: *.remind <minutes> <message>*');

  const minutes = parseInt(args[0]);
  if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
    return msg.reply('⏰ Please enter a valid number of minutes (1–1440).');
  }

  const reminderText = args.slice(1).join(' ');
  const chat = await msg.getChat();

  await msg.reply(`⏰ Got it! I'll remind you in *${minutes} minute(s)*.\n📝 _${reminderText}_`);

  setTimeout(async () => {
    try {
      await client.sendMessage(chat.id._serialized, `⏰ *Reminder!*\n\n📝 ${reminderText}\n\n_(Set ${minutes} minute(s) ago)_`);
    } catch (e) {
      console.error('Reminder failed:', e);
    }
  }, minutes * 60 * 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Group Rules
// ─────────────────────────────────────────────────────────────────────────────
const groupRules = new Map();

exports.rules = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const chat = await msg.getChat();
  const rules = groupRules.get(chat.id._serialized);

  if (!rules) {
    return msg.reply('📜 No rules have been set for this group yet.\n\nAdmins can set rules with *.setrules <rules text>*');
  }

  await client.sendMessage(chat.id._serialized, `📜 *Group Rules — ${chat.name}*\n\n${rules}`);
};

exports.setrules = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const chat = await msg.getChat();
  const senderId = msg.author || msg.from;
  const sender = chat.participants.find(p => p.id._serialized === senderId);

  if (!sender?.isAdmin) return msg.reply('⛔ Only admins can set rules.');
  if (!args.length) return msg.reply('📜 Usage: *.setrules <rules text>*');

  const rules = args.join(' ');
  groupRules.set(chat.id._serialized, rules);

  await msg.reply('✅ *Group rules have been updated!*');
};

exports.resetrules = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const chat = await msg.getChat();
  const senderId = msg.author || msg.from;
  const sender = chat.participants.find(p => p.id._serialized === senderId);

  if (!sender?.isAdmin) return msg.reply('⛔ Only admins can reset rules.');

  groupRules.delete(chat.id._serialized);
  await msg.reply('🗑️ Group rules have been cleared.');
};

// ─────────────────────────────────────────────────────────────────────────────
//  .kick
// ─────────────────────────────────────────────────────────────────────────────
exports.kick = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ This command only works in groups.');

  const chat = await msg.getChat();
  const participants = chat.participants;

  const botId = client.info.wid._serialized;
  const botParticipant = participants.find(p => p.id._serialized === botId);
  if (!botParticipant?.isAdmin) {
    return msg.reply('⚠️ I need to be an admin to kick members.');
  }

  const mentions = await msg.getMentions();
  if (mentions.length === 0) {
    return msg.reply('👥 Usage: *.kick @username*');
  }

  for (const user of mentions) {
    try {
      await chat.removeParticipants([user.id._serialized]);
      await msg.reply(`✅ Kicked *${user.pushname || user.id.user}* from the group.`);
    } catch (e) {
      console.error('Kick error:', e);
      await msg.reply(`❌ Could not kick ${user.id.user}: ${e.message}`);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .add
// ─────────────────────────────────────────────────────────────────────────────
exports.add = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ This command only works in groups.');

  const number = args[0];
  if (!number) return msg.reply('📞 Usage: *.add 00000*');

  const chat = await msg.getChat();
  const participants = chat.participants;
  const botId = client.info.wid._serialized;
  const botParticipant = participants.find(p => p.id._serialized === botId);

  if (!botParticipant?.isAdmin) {
    return msg.reply('⚠️ I need to be an admin to add members.');
  }

  try {
    await chat.addParticipants([`${number}@c.us`]);
    await msg.reply(`✅ Added *${number}* to the group.`);
  } catch (e) {
    await msg.reply(`❌ Could not add *${number}*. Make sure the number is correct.`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .promote
// ─────────────────────────────────────────────────────────────────────────────
exports.promote = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const mentions = await msg.getMentions();
  if (!mentions.length) return msg.reply('👥 Usage: *.promote @username*');

  const chat = await msg.getChat();

  for (const user of mentions) {
    await chat.promoteParticipants([user.id._serialized]);
    await client.sendMessage(chat.id._serialized, `⬆️ *${user.pushname || user.id.user}* is now an admin.`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .demote
// ─────────────────────────────────────────────────────────────────────────────
exports.demote = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const mentions = await msg.getMentions();
  if (!mentions.length) return msg.reply('👥 Usage: *.demote @username*');

  const chat = await msg.getChat();

  for (const user of mentions) {
    await chat.demoteParticipants([user.id._serialized]);
    await client.sendMessage(chat.id._serialized, `⬇️ *${user.pushname || user.id.user}* is no longer an admin.`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .mute / .unmute
// ─────────────────────────────────────────────────────────────────────────────
exports.mute = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');
  const chat = await msg.getChat();
  await chat.setMessagesAdminsOnly(true);
  await msg.reply('🔇 Group has been *muted*. Only admins can send messages.');
};

exports.unmute = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');
  const chat = await msg.getChat();
  await chat.setMessagesAdminsOnly(false);
  await msg.reply('🔊 Group has been *unmuted*. Everyone can send messages.');
};

// ─────────────────────────────────────────────────────────────────────────────
//  .tagall
// ─────────────────────────────────────────────────────────────────────────────
exports.tagall = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const chat = await msg.getChat();
  const participants = chat.participants;

  const messageText = args.length > 0 ? args.join(' ') : 'Attention everyone!';
  let text = `📢 *${messageText}*\n\n`;

  const mentions = [];

  try {
    const contactPromises = participants.map(async (participant) => {
      const contact = await client.getContactById(participant.id._serialized);
      mentions.push(contact);
      return `@${participant.id.user}`;
    });

    const tags = await Promise.all(contactPromises);
    text += tags.map(tag => `▪️ ${tag}`).join('\n');

    await client.sendMessage(chat.id._serialized, text, { mentions });
  } catch (error) {
    console.error('Tagall routing error:', error);
    await msg.reply('⚠️ Failed to compile all mentions due to a sync delay.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .info
// ─────────────────────────────────────────────────────────────────────────────
exports.info = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const chat = await msg.getChat();
  const admins = chat.participants.filter(p => p.isAdmin).length;

  const info = `
📋 *Group Info*

🏷️ Name: *${chat.name}*
👥 Members: *${chat.participants.length}*
👑 Admins: *${admins}*
📝 Description: ${chat.description || '_No description_'}
🆔 ID: \`${chat.id._serialized}\`
  `.trim();

  await msg.reply(info);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .owner
// ─────────────────────────────────────────────────────────────────────────────
exports.owner = async (client, msg, args) => {
  const ownerNumber = process.env.OWNER_NUMBER || '94765516398';
  
  const replyText = `⚡ *⚡ 𝕿𝖍𝖊 𝕸𝖆𝖘𝖙𝖊𝖗𝖒𝖎𝖓𝖉 ⚡*\n\n` +
                    `> 🎴 *Status:* Supreme Commander\n` +
                    `> 🌐 *Developer:* wa.me/${ownerNumber}\n\n` +
                    `*“Bow down to the one who pulls the strings.”* 👑🔥`;

  await msg.reply(replyText);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .id
// ─────────────────────────────────────────────────────────────────────────────
exports.id = async (client, msg, args) => {
  await msg.reply(`🆔 Chat ID:\n\`${msg.from}\`\n\n👤 Your ID:\n\`${msg.author || msg.from}\``);
};

// ─────────────────────────────────────────────────────────────────────────────
//  .clear
// ─────────────────────────────────────────────────────────────────────────────
exports.clear = async (client, msg, args) => {
  if (!(await checkIsGroup(msg))) return msg.reply('⛔ Groups only.');

  const count = parseInt(args[0]) || 10;
  if (count < 1 || count > 100) return msg.reply('🗑️ Please specify a number between 1 and 100.');

  const chat = await msg.getChat();

  try {
    const messages = await chat.fetchMessages({ limit: count });
    for (const m of messages) {
      try { await m.delete(true); } catch (_) {}
    }
    const confirm = await client.sendMessage(chat.id._serialized, `🗑️ Deleted *${messages.length}* messages.`);
    setTimeout(() => confirm.delete(true).catch(() => {}), 5000);
  } catch (e) {
    await msg.reply('❌ Could not delete messages. Make sure I am an admin.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  .reveal — reveal a one-time-view (view-once) image
//
//  Usage: reply to the view-once message with .reveal
//         OR use .reveal <msgId>  (if you have the message ID)
//
//  How it works:
//   • whatsapp.js intercepts every incoming view-once image, downloads it
//     immediately (before WhatsApp deletes it), and stores it in oneTimeImages.
//   • When .reveal is sent as a reply to that message, we look it up and
//     re-send the image to the chat.
// ─────────────────────────────────────────────────────────────────────────────
exports.reveal = async (client, msg, args) => {
  // Lazy-require to avoid circular dependency at module load time
  const { oneTimeImages } = require('../config/whatsapp');
  const chat = await msg.getChat();

  // ── Determine which message ID to look up ──
  let targetId = null;

  if (msg.hasQuotedMsg) {
    // Preferred: user replied to the view-once message with .reveal
    const quoted = await msg.getQuotedMessage();
    targetId = quoted.id.id;
  } else if (args[0]) {
    // Fallback: .reveal <msgId>
    targetId = args[0];
  }

  if (!targetId) {
    return msg.reply('👁️ *Usage:* Reply to a view-once image with *.reveal*\nOr: *.reveal <message id>*');
  }

  const stored = oneTimeImages[targetId];

  if (!stored) {
    return msg.reply('❌ No saved view-once image found for that message.\n\n_Note: The image must have arrived while the bot was running._');
  }

  // ── Re-send the stored image ──
  try {
    // stored.data is a full data URL: "data:image/jpeg;base64,/9j/..."
    const [header, base64Data] = stored.data.split(',');
    const mimetype = header.replace('data:', '').replace(';base64', ''); // e.g. "image/jpeg"

    const media = new MessageMedia(mimetype, base64Data, 'revealed.jpg');

    await client.sendMessage(chat.id._serialized, media, {
      caption: `👁️ *Revealed view-once image*\n📍 From: ${stored.from.split('@')[0]}\n🕐 ${stored.timestamp}`
    });

    // Optionally remove from store after reveal (one-time reveal)
    delete oneTimeImages[targetId];
  } catch (err) {
    console.error('Reveal error:', err.message);
    await msg.reply('⚠️ Failed to send the revealed image.');
  }
};



