# 🛠 3D Tank o'yini — Tuzatish va Yaxshilash Rejasi

> Holat: **BAJARILDI (kompyuterda)** — serverga (Railway) yuklash sizning ruxsatingizni kutmoqda.
> Sana: 2026-10-14

---

## 0. Nimani tekshirdim

- `TOP_100_PROBLEMS_ROADMAP.md` dagi 100 ta bandni kod bilan solishtirdim.
- O'yin kodini o'qidim: `index.html` (asosiy o'yin), `src/3d/Engine3D.js`, `src/3d/BattlefieldMap.js`, `src/3d/TankModel.js`, `server.js`.
- Videoni (65 soniya) kadrma-kadr ko'rib chiqdim (33 ta kadr).

---

## 1. Videoda ko'ringan kamchiliklar

| # | Ko'rganim | Sababi (kodda) |
|---|-----------|----------------|
| V1 | Kamera garaj devori ichiga kirib ketadi, ekranni yog'och devor to'sib qo'yadi (26–32-soniyalar) | Kamera orqasida devor bormi-yo'qmi tekshirilmaydi |
| V2 | 40-soniyada butun ekran yashil bo'lib qoladi | Garaj eshigidagi yashil "nur pardasi" orqali kamera o'tadi va hammasini bo'yaydi |
| V3 | O'z tankingiz ustidagi ism tablosi ("ABROR444") juda katta, ko'rinishni to'sadi | Tablo kameraga yaqin bo'lganda kattalashadi, o'zingizda ham ko'rsatiladi |
| V4 | Kamera tankka juda yaqin, tank ekranning yarmini egallaydi; dushman ko'rinmay qoladi | Kamera masofasi garaj ichida 8.5, ochiqda ham tez-tez yaqinlashadi |
| V5 | Otish/urilish paytida portlash, tutun, uchqun ko'rinmaydi | 3D dvigatel effektlarni umuman chizmaydi (eski 2D effektlar hisoblanadi, lekin ko'rinmaydi) |
| V6 | Yorug'lik "tekis", soyalar sezilmaydi, rasm "plastmassa"dek | Atrofdan yorug'lik juda kuchli (soyalarni yuvib yuboradi), rang sozlamasi oddiy |

---

## 2. Siz aytgan "ko'rinmas devor" — asosiy sabablar topildi ✅

O'yin 2D'dan 3D'ga o'tganda **o'yinning "miyasi" hali ham 2D xaritada ishlaydi**, 3D faqat "rasm". Ular bir-biriga mos kelmaydigan joylar:

1. **O'lgan tanklarning qoldig'i** — 2D'da qattiq to'siq, 3D'da umuman chizilmaydi. Tank portlagan joyda tank to'xtab qoladi, o'q ham "havoda" yo'qoladi. (eng katta sabab)
2. **Xarita o'lchami o'yinchi soniga qarab o'zgaradi** — 1 kishida 1300, 2 kishida 1950 kenglik. 3D xarita esa doim bir xil. Natija: do'stingiz bilan o'ynaganingizda **hamma to'siqlar joyidan siljiydi**, tank garajdan tashqarida paydo bo'lishi mumkin, chegara xaritadan tashqarida.
3. **G'isht devor buzilganda** — 2D'da yo'qoladi, 3D'da turaveradi (tank devor ichidan o'tib ketadi).
4. **Qum qoplari** — ko'rinadi, lekin to'siq emas (ichidan o'tib ketadi).
5. **Sovg'a qutilari** — 3D'da ko'rinmaydi, lekin ustidan o'tsangiz "ko'rinmas" quti olinadi.
6. To'siqlar ro'yxati **ikki joyda qo'lda yozilgan** (3D rasm va 2D to'siq alohida) — biri o'zgarsa ikkinchisi eskirib qoladi.

---

## 3. "Do'stimni otsam, unda darhol bilinsin" — sababi topildi ✅

Hozirgi tartib: siz otasiz → **sizning telefoningiz** "tegdi" deydi → server do'stingizga yuboradi → **do'stingizning telefoni** o'zidan jon ayiradi → keyin sizga yangi holat qaytadi. Ya'ni xabar 2 marta borib keladi, bundan tashqari:
- 3D'da urilish effekti yo'q (V5) — tegsa ham ko'rinmaydi.
- Do'stingiz ekranida o'q unga tegib o'tadi, lekin jon keyinroq ketadi (yoki aksincha).
- Har kim o'zi uchun "hakam" — firibgar (cheat) istagancha zarar yubora oladi.

---

## 4. "100 lab, 1000 lab odam" — haqiqiy holat ✅

- Hozir **hamma odam bitta xonaga** tushadi. 100 kishi kirsa, har bir telefon har soniyada 100 × 28 ta xabar oladi → **telefon ham, server ham qotadi**.
- Botlarni bitta o'yinchi telefoni boshqaradi — u chiqib ketsa botlar qotib qoladi.
- Xabarlar tekshirilmaydi, cheklanmaydi (bitta odam serverni "bombardimon" qila oladi).
- O'yinchi ismi orqali sahifaga zararli kod kiritish mumkin (ism tekshirilmaydi).

**Halol javob:** 1000 kishini *bitta jangda* hech qaysi telefon o'yini ko'tarmaydi (World of Tanks Blitz ham 7×7). To'g'ri yo'l — **kichik janglar (xonalar), lekin ular cheksiz ko'p**. 1000 kishi kirsa → ~125–250 ta parallel jang. Bitta server yuzlab xonani ko'taradi.

---

## 5. 100 ta banddan qaysilari haqiqatan bor (qisqa)

**Kodda tasdiqlangan muammolar (tuzatiladi):**
1, 2, 9, 10, 14, 15, 17, 22, 26, 31, 32, 33, 35, 36, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 53, 54, 58, 65, 67, 71, 80, 81, 82, 83, 84, 86, 89, 90, 91, 92, 93, 94, 95, 97

**Allaqachon hal qilingan (tegmayman):**
16 (barmoqlar alohida kuzatiladi), 29 (barmoq uzilsa to'xtaydi), 38 (3 soniyada qayta ulanadi), 59 (ekran sifati 2x bilan cheklangan), 61 (pastga surishda yopilmaydi), 88 (ovozlar fayl emas, yengil)

**Bu o'yinga keraksiz yoki hozircha erta (qilmayman, kerak bo'lsa keyin):**
12 (o'q-o'qqa urilishi), 34 (xarita endi kengaymaydi), 45, 55, 79 (reyting yo'q), 96, 99, 100 (faqat o'zbek tili)

**Qolganlari** (3, 4, 5, 6, 7, 8, 11, 13, 18–21, 23–25, 27, 28, 30, 37, 52, 56, 57, 60, 62–64, 66, 68–70, 72–78, 85, 87, 98) — ish davomida tekshiriladi, muammo chiqsa yo'l-yo'lakay tuzatiladi.

---

## 6. ISH REJASI (7 bosqich)

Har bosqich oxirida: testlar + brauzerda tekshiruv + sizga oddiy hisobot. Keyingisiga faqat oldingi ishlasa o'taman.

### 1-bosqich — Ko'rinmas devorlarni yo'qotish (eng muhim)
- Xarita o'lchami **doim bir xil** (1300×1300), o'yinchi soniga bog'liq emas.
- To'siqlar **bitta ro'yxatdan** olinadi — 3D rasm ham, to'siq ham shu ro'yxatdan quriladi (hech qachon mos kelmay qolmaydi).
- O'lgan tank qoldig'i 3D'da **yonib turgan qora tank** bo'lib ko'rinadi (ko'rinmas to'siq yo'qoladi).
- Buzilgan g'isht devor 3D'da ham qulaydi.
- Qum qoplari to'siq bo'ladi; suvda tank 50% sekinlashadi.
- Ko'rinmas sovg'a qutilari, chiroqli ustunlar va boshqa 2D qoldiqlari o'chiriladi (yoki 3D'da ko'rsatiladi).
- Devorga urilganda orqaga sakramaydi — **devor bo'ylab sirpanadi**, burchakda tiqilmaydi.
- Ko'rinmaydigan 2D effektlar hisoblanishi to'xtatiladi (telefon yengillashadi).
- **Test:** har bir 3D ob'ektning to'sig'i joyida ekanini avtomatik tekshiradigan test.

### 2-bosqich — Aniq fizika
- Fizika **har qanday telefonda bir xil tezlikda** ishlaydi (30 FPS ham, 120 FPS ham).
- O'q devorni "sakrab o'tib" ketmaydi (yo'li bo'ylab to'liq tekshiriladi).
- Tank shakli to'siqlar uchun aylana emas, **haqiqiy to'rtburchak** bo'ladi.
- Tank og'irligi seziladi (sekin tezlashadi, sekin to'xtaydi), tank-tank to'qnashuvi to'g'ri.
- O'q stvol uchidan chiqadi, o'z tankiga tegmaydi.

### 3-bosqich — Tarmoq: darhol javob va server "hakam"
- **Server o'zi hakam**: o'qlar va zararni server hisoblaydi, natijani ikkalangizga **bir vaqtda** yuboradi.
- Otgan zahoti **o'z ekraningizda** uchqun, portlash, raqibning qizarib ketishi darhol ko'rinadi (tasdiq kutmasdan).
- Kechikishni hisobga olish: server o'q otilgan paytdagi holatni eslab tekshiradi — "men tekkizdim, lekin hisoblanmadi" holati yo'qoladi.
- Boshqa tanklar silliq harakatlanadi (sakramaydi, orqaga tortilmaydi).
- Xabarlar hajmi 3–5 barobar kamayadi (mobil internet tejaladi).
- Botlarni **server** boshqaradi (hammada bir xil, hech kim chiqib ketsa ham qotmaydi).

### 4-bosqich — Ko'p odamga chidamlilik va himoya
- Xonalar avtomatik: bitta jangda **4 tagacha odam + botlar** (4 ta garaj bor), to'lsa yangi xona ochiladi.
- Do'st taklif qilsa — bir xonaga tushadi.
- Server har xabarni tekshiradi: tezlik, otish tezligi, zarar, xabar soni (soniyasiga 30 tadan ortiq — bloklanadi).
- Ismlardagi zararli kodlar tozalanadi.
- Bitta xato butun serverni yiqitmaydi; bo'sh xonalar xotiradan tozalanadi.
- **Sinov:** kompyuterda 300 ta "soxta o'yinchi" ulab, server qotmasligini o'lchayman.

### 5-bosqich — Chiroyli, lekin yengil grafika
- **Avtomatik sifat**: o'yin telefon kuchini o'zi o'lchaydi va 3 darajadan birini tanlaydi (kuchsiz telefonda soya soddaroq, aniqlik pastroq — lekin qotmaydi).
- Haqiqiy **quyosh nuri va soyalar**: tanklar, daraxtlar, garajlar yerga aniq soya tashlaydi; atrof yorug'ligi kamaytiriladi — hajm va chuqurlik paydo bo'ladi.
- Kinodagidek rang (ACES), ertalabki iliq quyosh, uzoqda yengil tuman, osmon gradienti.
- Garajdagi 4 ta qimmat chiroq o'rniga "arzon" yorug'lik (ko'rinishi bir xil, telefon 4 barobar yengil).
- Bir xil narsalar (daraxt, to'siq, qum qoplari) bitta buyruq bilan chiziladi — tezlik oshadi.
- **3D effektlar**: stvoldan olov chiqishi, o'q izi, portlash, qora tutun, uchqun, yonayotgan qoldiq, gusenitsa izi va chang. Bir vaqtda maksimal 200 zarracha (qotmaslik uchun).
- Kamera: devorga kirmaydi (V1), yashil parda yo'qoladi (V2), ism tablosi kichik va faqat raqiblarda (V3), kamera biroz uzoqroq va balandroq (V4); otganda yengil silkinish.
- Telefon "qora ekran" bo'lsa o'yin o'zini tiklaydi; boshqa ilovaga o'tsangiz o'yin pauza/ovoz o'chadi.

### 6-bosqich — Haqiqiydek ovozlar
- Ovozlar **3D**: chapdagi tank chap quloqda, orqadagi orqada, uzoqdagi past va bo'g'iq eshitiladi (kamera yo'nalishiga qarab).
- Motor ovozi tezlikka qarab o'zgaradi, to'xtasa jimiydi; gusenitsa shovqini.
- To'p otishi — kuchli zarba + aks-sado; temirga va g'ishtga tekkanda farqli ovoz; rikoshet.
- Ko'p ovoz birga chiqsa "qirsillamaydi" (ovoz cheklagich).
- 8-bit musiqa o'rniga yengil jang muhiti (shamol, uzoqdagi portlashlar).
- Ovoz faqat birinchi teginishdan keyin ochiladi (telefonlar talabi) — avtomatik.

### 7-bosqich — Yakuniy tekshiruv
- Barcha testlar (Jest) + ESLint + Prettier.
- Brauzerda telefon rejimida: FPS, xatolar, xotira 10 daqiqa o'yindan keyin.
- 2 ta oyna ochib "men va do'stim" holatini sinash (zarba darhol ko'rinishi).
- Xavfsizlik tekshiruvi.
- **Deploy (Railway) — faqat sizning ruxsatingiz bilan.**

---

## 7. Muhim eslatmalar

- Hozir kompyuteringizda **saqlanmagan (commit qilinmagan) o'zgarishlar bor** (`index.html`, `server.js`, `Engine3D.js`, `TankModel.js`). Ishni boshlashdan oldin ularni "saqlash nuqtasi" sifatida commit qilishni taklif qilaman — biror narsa buzilsa qaytish oson bo'ladi.
- 3-bosqich (server hakam) — eng katta o'zgarish. U tugaguncha eski va yangi versiya aralashmasligi uchun server va o'yin **birga** yangilanadi.
- Hamma ish uzoq: taxminan 7 ta katta qadam. Har qadamdan keyin sizga natija ko'rsataman.

---

## 8. Bajarilgan ishlar (2026-10-14)

| Bosqich | Holat | Izoh |
|---|---|---|
| 1. Ko'rinmas devorlar | ✅ | `src/shared/mapLayout.js` — 3D rasm, to'siqlar va server bitta manbadan. 2 ta garajning eshigi devorga qarab qurilgan edi — tuzatildi |
| 2. Aniq fizika | ✅ | O'q yo'li to'liq tekshiriladi, devor bo'ylab sirpanish, suvda sekinlashish, do'st tanki ichidan o'tib bo'lmaydi |
| 3. Darhol javob | ✅ | Server hakam; zarba hammaga bir vaqtda; otgan odamda effekt darhol; silliq harakat |
| 4. Ko'p odam / himoya | ✅ | 4 kishilik janglar, avtomatik yangi jang; firibgarlik va zararli ismdan himoya; 300 o'yinchi sinovi o'tdi |
| 5. Grafika | ✅ | Quyosh/soya, osmon, ufq, 3 xil sifat (avtomatik), effektlar, kamera devorga kirmaydi |
| 6. Ovoz | ✅ | 3D yo'nalish, aks-sado, ovoz cheklagich, motor telefon karnayida eshitiladi, jang muhiti |
| 7. Tekshiruv | ✅ | 35 ta avtomatik test, yuklama sinovi (`node scripts/loadtest.js`), brauzerda ikki o'yinchi sinovi |

**Keyinga qoldirildi:** botlarni to'liq serverga ko'chirish (hozir bitta o'yinchi telefonida, u chiqsa boshqasiga o'tadi).
