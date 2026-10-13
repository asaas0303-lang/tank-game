# 🤖 Antigravity Agent Qoidalari va Arxitektura Yo'riqnomasi

Ushbu qoidalar har qanday yangi vazifa, kod yaratish, o'yin rivojlantirish yoki Telegram / mobil integratsiyasida avtonom agent tomonidan qat'iy qo'llanilishi shart.

---

## 📌 Vositalar va Ularni O'z O'rnida Qo'llash Standartlari

### 🎨 1. Dizayn va UI/UX (Veb-saytlar va Portfoliolar)
- **Tailwind CSS & Framer Motion Generator:** Promt orqali zamonaviy dark-mode, neon/glassmorphism va silliq mikro-animatsiyalar talab qilinganda ishlatiladi.
- **AI UI Components (Shadcn / v0):** Ochiladigan modallar, formalari va dashboard komponentlarini noldan qayta yozmasdan, a11y standartlariga mos komponentlar bilan tezkor yaratish.
- *Qoida:* O'yin Canvas ichiga og'ir tashqi freymvorklar kiritilmaydi; ular faqat sayt, portfolio va boshqaruv panellari uchun qo'llaniladi.

---

### 📱 2. Telegram Mini Apps (TWA) va Botlar
- **Telegram Web Apps SDK:** 
  - To'liq ekran (`tg.requestFullscreen()`) va to'g'ri orientatsiya boshqaruvi.
  - Telegram'ning `X Yopish` va uch nuqta kabi tizimli tugmalariga xalaqit bermaslik (Safe-Area Insetlar).
  - Portret rejimida o'yinni qotirib qo'ymaslik (`tg.unlockOrientation()`), landshaft rejimida esa qulflash.
- **NestJS & Telegraf Visualizer:** Telegram botlar va Prisma DB arxitekturasini yaratishda modulli backend mantiqini shakllantirish.

---

### 🎮 3. 3D O'yinlar (Three.js & WebGL)
- **Three.js / WebGL Inspector:** 3D jang maydoni, tank modellari, realistik soyalar (PCFSoftShadowMap), yorug'lik va TPS kameralarni to'g'ri kalibrlash.
- **Touch & Mobile Controls:** 
  - Telefon 90° burilganda (forced landscape) joystik koordinatalarini matematik to'g'ri hisoblash (`gameDx = screenDy`, `gameDy = -screenDx`).
  - Silliq va sezgir harakatlanish (LERP).
  - Tugmalarni o'yinchining bosh barmog'iga qulay (ergonomik) joylashtirish.

---

### 📦 4. APK va Mobil Ilovalar
- **Capacitor / Cordova Wrapper:** Tayyor Web/Canvas o'yin yoki xizmat ilovalarini alohida Android kod yozmasdan, bitta buyruq bilan mustaqil APK ga aylantirish.
- **Flutter Code Generator:** Kross-platforma (Android + iOS) mobil ilovalarni Clean Architecture asosida kengaytirish.

---

## ⚡ Avtonom Bajarish va Tekshirish Tartibi
1. Vazifani tahlil qilish va eng to'g'ri vositani tanlash.
2. Kodni xavfsiz va aniq tahrirlash (`replace_file_content`).
3. Avtomatik sintaksis va test tekshiruvini o'tkazish (`node --check`, `npm test`).
4. O'zgarishlarni GitHub orqali Railway serveriga yuborish va jonli efirda tekshirish.
