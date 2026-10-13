const https = require('https');

/**
 * Lightweight Zero-Dependency Telegram Bot Service
 * Enables Telegram Mini App integration for the Tank Battle Arena
 */
function initTelegramBot(token, gameUrl) {
  if (!token) {
    console.log('ℹ️ TELEGRAM_BOT_TOKEN o\'rnatilmagan -- bot servisi o\'tkazib yuborildi.');
    return;
  }

  const appUrl = gameUrl || 'https://tank-game-production-c104.up.railway.app';
  console.log('🤖 Telegram Bot ishga tushmoqda, WebApp URL:', appUrl);

  function callTgApi(method, payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload || {});
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${token}/${method}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve({ ok: false, error: e.message });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  // 1. Set Menu Button to open Mini App directly
  callTgApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: "⚔️ O'ynash",
      web_app: { url: appUrl },
    },
  })
    .then((res) => {
      if (res && res.ok) {
        console.log("✅ Telegram Bot Menyusi (Web App) muvaffaqiyatli o'rnatildi!");
      } else {
        console.warn('⚠️ Menu button javobi:', res);
      }
    })
    .catch((err) => console.warn('Menu button xatosi:', err.message));

  // 2. Simple Long Polling for /start command
  let offset = 0;
  let isPolling = true;

  async function poll() {
    if (!isPolling) return;
    try {
      const res = await callTgApi('getUpdates', {
        offset: offset,
        timeout: 25,
        allowed_updates: ['message'],
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (msg && msg.text && msg.text.startsWith('/start')) {
            const firstName = (msg.from && msg.from.first_name) || 'Jangchi';
            const welcomeText =
              `🎖️ <b>Assalomu alaykum, Komandir ${firstName}!</b>\n\n` +
              `🚀 <b>AAA 3D WW2 Tank Battle Arena</b> ga xush kelibsiz!\n\n` +
              `• 4 ta harbiy garaj va real vaqtdagi janglar\n` +
              `• Ultra-HD 3D grafika va o'zgacha tanklar\n` +
              `• Do'stlar bilan yoki botlarga qarshi multiplayer\n\n` +
              `<i>O'yinni boshlash uchun quyidagi tugmani bosing:</i>`;

            await callTgApi('sendMessage', {
              chat_id: msg.chat.id,
              text: welcomeText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "⚔️ JANGNI BOSHLASH (3D)",
                      web_app: { url: appUrl },
                    },
                  ],
                ],
              },
            });
          }
        }
      }
    } catch (err) {
      // ignore network hiccups
    }
    setTimeout(poll, 1500);
  }

  poll();
}

module.exports = { initTelegramBot };
