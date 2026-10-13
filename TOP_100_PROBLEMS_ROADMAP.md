# 🎯 3D Tank Game — TOP 100 Ehtimoliy Muammolar va Kelajak Rejasi (Roadmap)

Ushbu hujjat o'yinni kengaytirish, xatoliklarni oldindan bilish va professional geymdev standartlari darajasida rivojlantirish uchun tayyorlangan 100 ta eng muhim muammolar va ularning texnik yechimlari to'plamidir.

---

## 💥 I. FIZIKA VA TO'QNASHUVLAR (Collisions & Physics)
1. **Tunneling effekti (Yuqori tezlikda o'tib ketish):** Tank nitro olganda yoki o'q tez uchganda devorni sakrab o'tishi (Yechim: CCD — Continuous Collision Detection).
2. **Burchakka qisilib qolish (Corner Sticking):** Tank ikki devor yoki garaj burchagiga 45° kirganda tiqilib qolishi (Yechim: Sliding plane / Normal vektorli sirpanish).
3. **O'qning o'z tankiga urilishi:** Tank oldinga harakatlanayotganda stvoldan chiqqan snaryad o'z korpusiga tegib ketishi (Yechim: Safe spawn offset).
4. **Tanklarning bir-birining ustiga chiqishi:** To'qnashuvda bir tank boshqasining tomiga chiqib ketishi (Yechim: 2D AABB/OBB qat'iy balandlik chegaralari).
5. **Daraxt tanasi va shoxlari nomutanosibligi:** Shoxlar sababli o'q havoda to'xtashi, lekin tank shox tagidan o'ta olmasligi (Yechim: Faqat tana uchun kollayder).
6. **Garaj eshigi tiqilishi (Door Bottleneck):** Ikki tank bir vaqtda eshikka tiqilib bir-birini qulflashi (Yechim: Yumshoq itarish kuchi).
7. **Garaj tomiga snaryad tushishi:** Burchakdan uchgan snaryadning garaj tomini teshib o'tishi (Yechim: Tom balandligida to'qnashuv tekshiruvi).
8. **Daryo/Suv fizikasi yo'qligi:** Suvga kirganda sekinlashmasdan quruqlikdek yurishi (Yechim: Suv yuzasida tezlikni 50% ga kamaytirish).
9. **Devor parchalari (Debris) to'siq bo'lishi:** Buzilgan g'isht devor parchalari tank yo'lini to'sib qo'yishi (Yechim: Parchalarni vizual effekt qilish, to'siq qilmaslik).
10. **Rebound (Orqaga otilib ketish):** Tank devorga urilganda qarama-qarshi tomonga sakrab ketishi (Yechim: Elastiklik koeffitsiyenti = 0).
11. **Anti-tank kirpilari (Hedgehogs) orasida tiqilish:** Chex kirpilari orasida tankning qimirlamay qolishi (Yechim: Kirpilar radiusini aniq kalibrlash).
12. **Snaryadlarning to'qnashuvi:** Ikki snaryad havoda urilganda yo'qolishi yoki to'xtashi.
13. **Yiqilish va ag'darilish:** 3D relyefda tankning yonboshlab qolishi (Yechim: Y-o'qida qulflangan gorizontal orientatsiya).
14. **To'lqinli (Jitter) to'qnashuv:** Devorga ishqalanib yurganda qaltirash (Yechim: Skin thickness / Margin kiritish).
15. **To'qnashuv va vizual masshtab farqi:** 3D model kattalashib, uning ortidagi matematik to'siq kichik bo'lib qolishi (Yechim: Bounding Boxlarni Three.js dan dinamik olish).

---

## 🎮 II. BOSHQARUV, JOYSTIK VA KAMERA (Controls & Camera)
16. **Multi-touch konflikt:** Chap qo'l harakatlanayotganda o'ng qo'l surishi uzilib qolishi (Yechim: Unikal touch id larni ajratish).
17. **Kamera devor ichiga kirishi (Clipping):** Garaj orqasida TPS kamera devor ichiga kirib qolishi (Yechim: Kamera Raycasting).
18. **Telefon 180° ag'darilganda orientatsiya chalkashishi:** Ekran aylanganda koordinata o'qlarining buzilishi.
19. **O'ng qo'l surishining ekran chetiga yetib to'xtashi:** Minorani 360° burish uchun barmoq chetga yetib qolishi (Yechim: Delta-based relative drag).
20. **Tugma bosishdagi kechikish (Touch Lag):** 100ms kechikish (Yechim: Passive listeners va touch-action: none).
21. **Auto-Aim noto'g'ri dushmanga yopishishi:** Uzoqdagi nishon qolib botga tortib ketishi (Yechim: FOV va dushman xavf ustuvorligi).
22. **Nishonning sakrashi (Aim Snap Jitter):** Minoraning qaltirab sakrab burilishi (Yechim: LERP burchak silliqlash).
23. **Tasodifiy o't ochish (Accidental Fire):** Ekranni surayotganda otish tugmasiga tegib ketish (Yechim: Tugmalar orasida ergonomik masofa).
24. **Orqaga yurganda boshqaruv chalkashishi:** Orqaga harakatda chap/o'ng boshqaruvini tushunmaslik.
25. **Planshetlarda tugmalar uzoqlashishi:** Katta ekranda bosh barmoq yetmasligi (Yechim: Adaptiv media-query marginlari).
26. **Kamera silkinishi (Shake Overload):** Ko'p otishmada kamera qattiq titrashi (Yechim: Shake intensivligini chegaralash).
27. **FPS ga bog'liq burilish tezligi:** 30 FPS telefonda minora sekin, 120 FPS da tez burilishi (Yechim: deltaTime ga qat'iy bog'lash).
28. **Harakat joystikining o'lik zonasi (Deadzone):** Kichik siljishlarda tank qimirlamasligi (Yechim: 5% radial deadzone).
29. **Barmoq uzilganda to'xtamay ketish:** Sensor uzilganda tankning yurib ketishi (Yechim: pointercancel va window blur tozalash).
30. **Bildirishnoma kelganda harakat qotishi:** Tizim oynasida joystik yurishda qolib ketishi.

---

## 🌐 III. TARMOQ, MULTIPLAYER VA REAL-VAQT (Network & Sync)
31. **Desinxronizatsiya (Desync):** Mening ekranimda ochiqda, serverda devor orqasida (Yechim: Client-side prediction + reconciliation).
32. **Ghost Hits (Ko'rinmas zarbalar):** O'q dushmanga tegib portlaydi, lekin HP ketmaydi (Yechim: Server-side lag compensation).
33. **Rubberbanding:** Ping oshganda tank oldinga yurib yana orqaga otilishi.
34. **Xarita kengayganda kadrlar to'xtashi:** Yangi sektor qo'shilganda o'yinning 1 soniya qotishi (Yechim: Asinxron generatsiya).
35. **Disconnect bo'lgan tank qotib turishi:** Chiqib ketgan o'yinchi to'siq bo'lib qolishi (Yechim: Botga aylantirish).
36. **Mobil internetda paket yo'qolishi (Packet loss):** Otilgan o'qlar yetib bormasligi (Yechim: Binary WebSocket payloads).
37. **High Ping afzalligi (Peeker's advantage):** Qotayotgan o'yinchi burchakdan chiqib otishi.
38. **WebSocket avto-ulanmasligi (Auto-reconnect):** Ekran qulflanganda o'yin serverdan uzilishi (Yechim: 3 soniyalik qayta ulanish sikli).
39. **Xabarlar tiqilishi (Message Queueing):** Sekin internetda paketlar to'planib birdan tezlashishi.
40. **Botlarning turli o'yinchilarda boshqa ko'rinishi:** Bot koordinatasining sinxron bo'lmasligi (Yechim: Botlar to'liq serverda hisoblanishi).
41. **Serverda xotira oqishi (Node.js leak):** Xonalar yopilganda RAM tozalanmasligi.
42. **Yuklama ko'payganda Server Tick Rate tushishi:** 60 Hz dan 15 Hz ga tushishi (Yechim: Worker threads).
43. **Host migration muammosi:** Xona egasi chiqib ketganda xona buzilishi.
44. **Megabayt sarfi ko'pligi:** Mobil internet trafigining tez tugashi (Yechim: Delta siqish).
45. **Vaqt sinxronizatsiyasi buzilishi:** Telefon soati farqi tufayli taymerlar adashishi.

---

## ⚡ IV. GRAFIKA, THREE.JS VA SMARTFON RESURSLARI
46. **Telefon qizib ketishi (Thermal Throttling):** 10 daqiqadan so'ng FPS tushishi (Yechim: Optimallashtirilgan render loop).
47. **Batareya tez tugashi:** GPU maksimal zo'riqishi (Yechim: 60 FPS qulf).
48. **WebGL Context Lost:** RAM to'lganda qora ekran paydo bo'lishi (Yechim: restoreContext handleri).
49. **Xotira oqishi (Three.js memory leak):** Geometriya va teksturalar xotirada to'planishi (Yechim: dispose() metodlari).
50. **Soyalar (ShadowMap) tufayli FPS tushishi:** 4 ta garaj va 12 ta archa soyasi (Yechim: Soddalashtirilgan yo'nalishli soya).
51. **Draw Call sonining ko'pligi:** Ob'yektlar ko'pligi (Yechim: InstancedMesh ishlatish).
52. **Teksturalar VRAM to'ldirishi:** Katta rasmlar telefonni qotirishi (Yechim: Max 512x512 teksturalar).
53. **Parchalar (Particles) limitidan oshish:** Bir vaqtda 5000 ta tutun zarrasi chiqishi (Yechim: Max 200 ta zarracha limiti).
54. **Eski telefonlarda ACESFilmicToneMapping qora ekran berishi.**
55. **Daryo suv shaderi arzon telefonlarda sekin ishlashi.**
56. **Kichik ekranlarda teksturalar jimirlashi (Aliasing/Moire).**
57. **Z-Fighting (Ikki yuzaning miltillashi):** Yo'l va o't tekisligi to'qnashuvi (Yechim: PolygonOffset).
58. **Frustum Culling ishlamasligi:** Kamera orqasidagi ob'yektlar hisoblanishi.
59. **Retina ekranlarda 4K yuklama:** (Yechim: devicePixelRatio max 2 qilib cheklash).
60. **Garaj ichining qop-qora bo'lib qolishi:** (Yechim: Garaj ichiga nurli PointLight chiroq o'rnatish).

---

## 📱 V. TELEGRAM MINI APP (TWA) VA MOBIL BRAUZER
61. **Surishda o'yin yopilib ketishi (Swipe-down close):** (Yechim: tg.disableVerticalSwipes()).
62. **Klaviatura ochilib ekranni siqishi:** Nickname yozishda 3D ekran ezilishi.
63. **iOS Telegram to'liq ekranni qisishi:** Safari navigatsiyasi xalaqit berishi.
64. **Qora hoshiyalar (Notch / Dynamic Island):** Tugmalar kamera tagida qolishi.
65. **Fonda audio chalinib turishi:** Telegram yopilganda motor ovozi o'chmasligi (Yechim: visibilitychange).
66. **Kesh yangilanmasligi:** Yangi kod chiqqanda eski versiya qotib turishi (Yechim: ServiceWorker kesh yangilash).
67. **Android Orqaga (Back) tugmasi:** Bosilganda tasodifan o'yindan chiqish (Yechim: tg.BackButton).
68. **Desktop va Mobile farqi:** Kompyuterda joystik ko'rinib qolishi.
69. **Oq/Qora tema ziddiyati:** Telegram oq mavzuga o'tganda xunuk chegaralar chiqishi.
70. **Telegram Webview RAM limiti:** 250MB dan oshganda Telegram o'yinni o'chirishi.

---

## ⚔️ VI. O'YIN BALANSI VA JANG MEXANIKASI
71. **Spawn Camping:** Garaj eshigi oldida dushmanni kutib turib o'ldirish (Yechim: 3 soniyalik daxlsiz qalqon).
72. **Garaj ichiga yashirinib olish (Turtle Camping):** (Yechim: Garajda 15 soniyadan ortiq tursa xavf tutuni).
73. **Tezlik va og'irlik balansi:** Tank yengil kartingdek ko'rinishi (Yechim: Og'irlik inertsiyasi).
74. **Bitta o'qda o'lish (One-shot kill):** Yangi o'yinchining darhol o'lishi (Yechim: Boshlang'ich armor balansi).
75. **AI Botlarning juda ahmoq yoki o'ta mergan bo'lishi:** (Yechim: Sezgirlik va adaptiv nishon).
76. **Botlarning garaj devoriga urilib yotishi:** (Yechim: A* to'g'ri chiqish marshruti).
77. **O'q zaxirasi tugab qurolsiz qolish:** (Yechim: Sekin avto-zaryadlanish).
78. **Nitro suiiste'moli:** To'xtovsiz qochib yurish (Yechim: Nitro cooldown).
79. **Reyting firibgarligi:** Do'stlar bir-birini ataylab o'ldirishi.
80. **O'limdan keyin kameraning yo'qolib qolishi:** Portlashdan so'ng kamera harakatsiz qolishi.

---

## 🔊 VII. OVOZ VA AUDIO TIZIMI
81. **AudioContext avto-bloklanishi:** Foydalanuvchi ekranga teginmaguncha ovoz chiqmasligi.
82. **Ovoz shovqinga aylanishi (Clipping):** 4 ta tank birga otganda qirsillash (Yechim: Master DynamicsCompressor).
83. **Spatial 3D ovoz yetishmasligi:** Uzoqdagi tovush yaqinda yangrashi (Yechim: PannerNode masofa filtri).
84. **Motor ovozi qotib qolishi:** Tank to'xtaganda ham motor shovqini o'chmasligi.
85. **iOS Safari past ovoz sifati va kechikishi.**
86. **Temir va g'ishtga tekkandagi tovush farqi yo'qligi.**
87. **Bluetooth quloqchin ulanganda ovoz yo'qolishi.**
88. **Audio fayllar og'irligi:** Sayt yuklanishini sekinlashtirishi (Yechim: Yengil Web Audio sintezi).

---

## 🛡️ VIII. XAVFSIZLIK VA ANTI-CHEAT
89. **Speedhack:** Konsolda tezlikni 999 qilish (Yechim: Server tezlik tekshiruvi).
90. **Wallhack:** Devor ortidan otish (Yechim: Server-side Raycast to'siq tekshiruvi).
91. **Rapid Fire:** Reload vaqtini 0 qilib pulemyotdek otish.
92. **Packet Flooding / DDoS:** Sekundiga 1000 paket yuborish (Yechim: Rate limit 20 msg/sec).
93. **Fake Damage injection:** Soxta zarar yuborish.
94. **Nickname spami va XSS buzg'unchiligi:** (<script> filtratsiyasi).
95. **Server qulashi (Crash loop):** Bitta xato sabab hamma xonalar o'chishi (Yechim: Graceful error handling).

---

## 📊 IX. UI/UX VA MA'LUMOTLARNI SAQLASH
96. **Ma'lumotlar yo'qolishi:** Kesh tozalanganda yutuqlar o'chishi (Yechim: Telegram CloudStorage).
97. **Ekran o'zgarganda HUD buzilishi:** Reyting jadvali tugmalarga minib qolishi.
98. **Zaif internetda yuklanish ekrani qotishi:** (Yechim: Progress-bar preloader).
99. **G'alaba va mukofot hissi yetishmasligi:** Jang tugagach qiziqish yo'qolishi.
100. **Ko'p tillilikda matn sig'masligi:** O'zbekcha/ruscha/inglizcha matnlar tugmaga sig'masligi.
