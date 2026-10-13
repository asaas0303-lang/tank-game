---
description: Promt-asosidagi ilg'or vositalar, plaginlar va ularni o'z o'rnida ishlatish qat'iy qoidalari
trigger: always_on
---

# 🎯 Maxsus Arxitektura va Vositalardan O'z O'rnida Foydalanish Qoidalari

Ushbu qoidalar har qanday yangi funksiya, dizayn yoki tizim yaratishda qat'iy amal qilinishi shart bo'lgan yo'riqnomadir. Barcha vositalar va plaginlar faqat o'z yo'nalishi va maqsadiga ko'ra to'g'ri qo'llanilishi lozim.

---

## 🎨 1. Dizayn va UI/UX (Veb-saytlar, Portfoliolar va Dashboardlar uchun)

### 🔹 Tailwind CSS & Framer Motion Generator
- **Qachon ishlatiladi:** Promt orqali zamonaviy to'q rangli (dark mode), neon/glassmorphism uslubidagi menyular, tugmalar, kartalar va silliq mikro-animatsiyalar talab qilinganda.
- **Qoidasi:** Ortiqcha og'ir CSS fayllar yozmasdan, modulli utility-classlar va framer-motion animatsiyalari orqali zamonaviy premium ko'rinish berish.

### 🔹 AI UI Components (Shadcn UI / v0)
- **Qachon ishlatiladi:** Foydalanuvchi interfeysi komponentlari (modallar, bildirishnomalar, ro'yxatdan o'tish/kirish formalari, boshqaruv panellari, jadvallar) kerak bo'lganda.
- **Qoidasi:** G'ildirakni qaytadan kashf qilmasdan, qulay va accessibility (a11y) talablariga javob beradigan tayyor strukturalardan foydalanish.

---

## 📱 2. Telegram Mini Apps (TWA) va Bot Tizimlari

### 🔹 Telegram Web Apps SDK Integratsiyasi
- **Qachon ishlatiladi:** Ilova Telegram ichida Mini App sifatida ochilganda.
- **Qoidasi:**
  1. Telegram'ning rang sxemalariga (Dark/Light mode) to'liq moslashish.
  2. Boshlang'ich yuklanishda `tg.expand()`, `tg.ready()` va `tg.requestFullscreen()` chaqirish.
  3. Safe-area insetlar (`--tg-content-safe-area-inset-*`) va Telegram tizimli tugmalariga (`X Yopish`, `⋮`) xalaqit bermaydigan qilib UI elementlarini xavfsiz masofaga joylashtirish.
  4. Portret rejimida Telegram'ni vertikal qotirib qo'ymaslik (`tg.unlockOrientation`), landshaftda esa qulflash.

### 🔹 NestJS & Telegraf Visualizer (Botlar va Backend)
- **Qachon ishlatiladi:** Telegram botlari, ma'lumotlar bazasi (Prisma/PostgreSQL), webhooklar va server mantiqi yaratilganda.
- **Qoidasi:** Bot arxitekturasini modulli, xavfsiz va xatoliklarga chidamli (graceful error handling) qilish.

---

## 🎮 3. 3D O'yinlar va Grafik Dvigatellar (Three.js & WebGL)

### 🔹 Three.js / WebGL Inspector & Optimizer
- **Qachon ishlatiladi:** 3D jang maydoni, tank modellari, yorug'lik manbalari (DirectionalLight, HemisphereLight), soyalar (PCFSoftShadowMap) va kameralar bilan ishlaganda.
- **Qoidasi:**
  1. Kadrlarni (FPS) tushirmaslik uchun geometriya va materiallarni qayta ishlatish (object pooling).
  2. Teksturalar va tonemapping (ACESFilmicToneMapping) orqali Ultra-HD sifatni ta'minlash.

### 🔹 Touch & Mobile Controls Tizimi
- **Qachon ishlatiladi:** Mobil qurilmalarda 3D o'yinni boshqarishda (joystiklar, nishonga olish, maxsus harakatlar).
- **Qoidasi:**
  1. Ekran 90° burilganda (forced landscape) ham sensorli koordinatalarni matematik to'g'ri hisoblash (`gameDx = screenDy`, `gameDy = -screenDx`).
  2. Silliq harakatlanish uchun LERP (Linear Interpolation) dan foydalanish.
  3. Boshqaruv tugmalarini o'yinchining bosh barmog'iga qulay ergonomik joylashtirish.

---

## 📦 4. Mobil APK Ilovalar va Wrapperlar

### 🔹 Capacitor / Cordova Wrapper
- **Qachon ishlatiladi:** Veb-o'yin, veb-sayt yoki navbat boshqaruv tizimini Android APK formatiga aylantirishda.
- **Qoidasi:**
  1. Alohida murakkab Android kod yozmasdan, mavjud Web/Canvas/WebGL kodini to'g'ridan-to'g'ri APK ga o'rash.
  2. Offline kesh va to'liq ekranli mobil rejimni ta'minlash.

### 🔹 Flutter Code Generator
- **Qachon ishlatiladi:** Loyihani to'liq kross-platforma mobil ilova (Android + iOS) sifatida kengaytirish talab qilinganda.
- **Qoidasi:** Clean Architecture tamoyillari asosida vidjetlar va state management (Bloc/Provider) tizimini shakllantirish.

---

## ⚖️ Oltin Qoida: "O'z O'rnida Foydalanish"
1. **O'yinlar uchun:** Faqat o'yin uchun kerakli yengil vositalar ishlatiladi (Three.js + Vanilla JS + Canvas), og'ir tashqi ramkalar o'yin ichiga aralashtirilmaydi.
2. **Dashboard / Portfolio uchun:** Zamonaviy UI vositalari (Tailwind CSS, Shadcn) ishlatiladi.
3. **Telegram ilovalar uchun:** Telegram SDK imkoniyatlari to'liq ishlatiladi.
4. **Har bir o'zgarishdan keyin:** Avtonom testlar (`npm test`) o'tkaziladi va deploy tekshiriladi.
