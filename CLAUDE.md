# 🚀 Mukammal Loyiha Arxitekturasi va Qat'iy Qoidalar Qo'llanmasi (Claude Code versiyasi)

Bu fayl — sizning avvalgi "Mukammal Arxitektura Qo'llanmasi"ngizning Claude Code'ga moslashtirilgan versiyasi. U sizning konseptual (tasavvuriy) 4 ta rolingizni endi **haqiqiy, o'rnatiladigan 5 ta plagin** bilan almashtiradi va qolgan barcha qoidalarni (Jest, ESLint, Sentry va h.k.) saqlab qoladi.

Bu faylni loyihangiz papkasining eng tepasiga (root) `CLAUDE.md` nomi bilan joylashtiring — Claude Code har safar sessiya boshlaganda buni avtomatik o'qiydi va shu qoidalar asosida ishlaydi.

---

## 1. 🤖 Ishchi Rollarim — endi haqiqiy plaginlar orqali

Avvalgi qo'llanmada "GSD Core", "Roo Code", "Ralph Loop", "CodeRabbit" — bular tasavvuriy (konseptual) rollar edi. Claude Code'da bularning **haqiqiy, o'rnatiladigan versiyalari** bor:

| Eski konseptual rol             | Endi qaysi plagin              | Vazifasi                                                                 |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| GSD Core (Miya — reja tuzuvchi) | **Superpowers**                | G'oyani aytasiz → savol beradi → to'liq reja yozadi                      |
| Roo Code (Dasturchi)            | **Superpowers** (sub-agentlar) | Reja asosida fayllarni yozadi, controller/service/middleware yaratadi    |
| Ralph Loop (Tester-tuzatuvchi)  | **Superpowers** + Caveman      | Xato chiqsa, sizdan so'ramasdan o'zi qayta-qayta tuzatadi                |
| CodeRabbit (Auditor)            | **Claude Security**            | Ish tugagach kodni xavfsizlik va sifat bo'yicha yakuniy tekshiradi       |
| — (yangi qo'shimcha)            | **Claude Code Setup**          | Loyihani skanerlab, unga qaysi hook/skill/MCP kerakligini tavsiya qiladi |
| — (yangi qo'shimcha)            | **OmniRoute** (ixtiyoriy)      | Claude limitiga yetganda boshqa AI modelga avtomatik o'tkazadi           |

### Plaginlarni o'rnatish (Claude Code terminalida bir marta yoziladi)

```bash
# 1) Superpowers — reja tuzish, kod yozish, o'zini tekshirish
/plugin install superpowers@claude-plugins-official

# 2) Claude Code Setup — loyihani skanerlab kerakli narsalarni tavsiya qiladi
/plugin install claude-code-setup@claude-plugins-official

# 3) Claude Security — xavfsizlik zaifliklarini qidiradi va tuzatish taklif qiladi
/plugin install claude-security@claude-plugins-official
/reload-plugins
```

> Agar "Marketplace topilmadi" degan xato chiqsa, avval shuni yozing:
> `/plugin marketplace add anthropics/claude-plugins-official`, so'ng yuqoridagi buyruqlarni qaytadan yozing.

**Caveman** (token tejash, alohida marketplace):

```bash
claude plugin marketplace add JuliusBrussee/caveman
claude plugin install caveman@caveman
```

**OmniRoute** (ixtiyoriy — token limitiga yetganda boshqa modelga o'tish; alohida dastur, PC'da doim ishlab turishi kerak):

```bash
npm install -g omniroute
omniroute
# Dashboard: http://localhost:20128 ochiladi, u yerdan bepul provayder ulanadi
omniroute setup-claude   # Claude Code uchun profil yaratadi
```

⚠️ Eslatma: sizning kompyuteringiz (Intel i5-2400, 8GB RAM) uchun OmniRoute qo'shimcha yuklama beradi. Agar Claude Code'da g'alati "tool ishlamayapti" degan xatolar chiqsa — birinchi OmniRoute'ni o'chirib ko'ring.

---

## 2. 🛠 Haqiqiy Dasturlash Vositalari (o'zgarishsiz qoladi)

Bular — loyihaga o'rnatiladigan haqiqiy npm paketlar, Claude yoki Antigravity'ga bog'liq emas, ikkalasida ham bir xil ishlaydi:

### 1) Jest va ts-jest (Testlash)

- **O'rni:** `src/utils/__tests__` kabi papkalarda.
- **Vazifasi:** Har bir funksiya to'g'ri ishlashini tekshiradi, kelajakda buzilib qolishining oldini oladi.

### 2) ESLint (Sintaksis nazorati)

- **O'rni:** `.eslintrc.json`, barcha `.ts` fayllarni nazorat qiladi.
- **Vazifasi:** Mantiqsiz o'zgaruvchilar, ishlatilmagan funksiyalar va xatolarni yozilayotgan paytdayoq ko'rsatadi.

### 3) Prettier (Formatlash)

- **O'rni:** `.prettierrc`.
- **Vazifasi:** Barcha kodni bir xil uslubga keltiradi.

### 4) Husky & lint-staged (Darvozabon)

- **O'rni:** `.husky/pre-commit` va `package.json`.
- **Vazifasi:** `git commit` qilishdan oldin ishga tushadi — ESLint yoki Prettier xatosi bo'lsa, commit qilishga ruxsat bermaydi. Loyihaga faqat 100% toza kod kiradi.

### 5) Sentry (Xatolarni kuzatish)

- **O'rni:** `server.ts` yoki `app.ts` (`@sentry/node`).
- **Vazifasi:** Production'dagi kutilmagan xatolarni ushlab, qaysi qatorda ekanini ko'rsatadi. Mijoz ma'lumotlarini o'zi yashiradi.

### O'rnatish buyruqlari:

```bash
# Jest
npm install -D jest ts-jest @types/jest

# ESLint + Prettier
npm install -D eslint prettier husky lint-staged @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier

# Husky
npx husky init

# Sentry
npm install @sentry/node @sentry/profiling-node
```

---

## 3. 📜 Qat'iy Ish Qoidalari (yangilangan kelishuv)

Claude Code loyihada ishlaganda quyidagi qoidalarga so'zsiz rioya qiladi:

1. **Loyihani tanish:** Yangi loyiha yoki katta o'zgarishdan oldin **Claude Code Setup** plagini orqali (`/claude-code-setup`) loyihani skanerlab, kerakli sozlamalarni tavsiya qiladi.
2. **Rejaga qarash:** Har qanday yangi funksiya so'ralganda, avval **Superpowers** orqali savol-javob qilib, aniq reja tuziladi va sizga ko'rsatiladi — shundan keyingina kod yozishga o'tiladi.
3. **Kodni toza yozish:** Har doim ESLint va Prettier standartlarida.
4. **Majburiy testlar:** Har bir muhim mantiq uchun Jest testi yoziladi.
5. **Jimgina tuzatish (Ralph Loop mantiqi):** Kod yoki test xato bersa, "buni qanday tuzataylik" deb so'ramaydi — Superpowers sub-agentlari orqali o'zi qayta-qayta tuzatadi, faqat natijani xabar qiladi.
6. **Token tejash:** Barcha ishlar fonda **Caveman** orqali siqilgan holda bajariladi — sizdan hech qanday qo'shimcha amal talab qilinmaydi, shunchaki xarajat kamayadi.
7. **Yakuniy xavfsizlik nazorati:** Ish tugagach (ayniqsa deploy oldidan), **Claude Security** plagini orqali (`/claude-security`) kod zaifliklarga tekshiriladi. Hech narsa avtomatik qo'llanilmaydi — barcha tuzatishlar sizga ko'rsatiladi, faqat siz tasdiqlagach qo'llanadi.
8. **Oddiy hisobot:** Natija tayyor bo'lgach, sizga texnik atamalarsiz, oddiy o'zbek tilida "Tayyor bo'ldi, bularni qildim" tarzida hisobot beriladi.

---

## 4. 🔁 Ishlash oqimi (bir nechta funksiya so'ralganda)

```
Siz: "Foydalanuvchi ro'yxatdan o'tish funksiyasini qo'sh"
   ↓
Claude Code Setup (agar birinchi marta) → loyihani skanerlaydi
   ↓
Superpowers: Brainstorm → savol beradi (masalan: "email tasdiqlash kerakmi?")
   ↓
Superpowers: Plan → to'liq reja yozadi (fayllar, funksiyalar)
   ↓
Superpowers: Execute → sub-agentlar kodni yozadi (Jest testlari bilan birga)
   ↓
Superpowers: Review → kod review, xato bo'lsa o'zi tuzatadi (Caveman token tejaydi)
   ↓
Claude Security: yakuniy xavfsizlik tekshiruvi (kerak bo'lsa)
   ↓
Sizga: oddiy tilda hisobot — "Tayyor, ro'yxatdan o'tish qo'shildi, testlar o'tdi"
```

---

## 5. 🌐 Deployment (o'zgarishsiz)

Kod → GitHub (`asaas0303-lang`) → Render yoki Railway orqali avtomatik deploy. Deploy'dan oldin har doim ESLint/Prettier tekshiruvi va (kerak bo'lsa) Claude Security skanidan o'tkaziladi.
