# PC Taqqos — kompyuterlarni taqqoslash sayti

O'quv loyihasi: noutbuk va stol kompyuterlarini xususiyatlari bo'yicha yonma-yon solishtiradigan sayt.
Frontend (HTML/CSS/JS) + backend (Python + SQLite). **Hech qanday kutubxona o'rnatish shart emas.**

## Ishga tushirish

### 1-usul. To'liq variant (server + baza) — tavsiya etiladi
Kompyuteringizda **Python 3.8+** bo'lishi kerak ([python.org](https://www.python.org/downloads/); Windows'da o'rnatishda
"Add Python to PATH" belgisini qo'ying).

- **Windows:** `run.bat` faylini ikki marta bosing.
- **macOS / Linux:** terminalda `./run.sh` (yoki `python3 server/server.py`).
- **VS Code:** `Terminal → New Terminal`, keyin `python server/server.py` (Windows'da `py server\server.py`).

Brauzer o'zi `http://localhost:8000` manzilini ochadi. To'xtatish: terminalda `Ctrl+C`.
Boshqa port kerak bo'lsa: `python server/server.py --port 8080`.

### 2-usul. Faqat frontend (serversiz)
`frontend/index.html` faylini brauzerda oching (yoki VS Code'da Live Server). Hamma narsa ishlaydi,
faqat ma'lumotlar (sharhlar, qo'shilgan kompyuterlar, sevimlilar) shu brauzerning xotirasida saqlanadi.
Sayt rejimni o'zi aniqlaydi; pastki qismda "Rejim: server (SQLite)" yoki "Rejim: mahalliy" yozuvi chiqadi.

## Administrator
"Boshqaruv" tugmasi → kompyuter qo'shish/o'chirish, JSON/CSV eksport, JSON import.
Server rejimida parol kerak: standart **`admin123`**. O'zgartirish:
- Windows (cmd): `set ADMIN_PASSWORD=yangi_parol && py server\server.py`
- macOS/Linux: `ADMIN_PASSWORD=yangi_parol python3 server/server.py`

Mahalliy rejimda parol so'ralmaydi (o'zgarishlar faqat sizning brauzeringizda).

## Imkoniyatlar
- 14 ta kompyuter katalogi; yangilarini qo'shish mumkin
- Qidiruv va filtrlar: tur, maqsad, brend, narx, RAM, SSD, ekran, batareya, sevimlilar
- Saralash: unumdorlik, narx, narx/sifat, baho
- 2–3 ta modelni taqqoslash: jadval, eng yaxshi natija (sariq), farq foizi, "faqat farqlar", radar diagramma
- Taqqoslashni havola orqali ulashish (`#compare=3,8,9`), CSV yuklab olish, chop etish
- "Menga mos kompyuter": byudjet va ehtiyojga qarab top-3 tavsiya
- Narx va unumdorlik xaritasi (nuqtali diagramma)
- Narx USD yoki so'mda (kursni o'zgartirish mumkin)
- Uch til: o'zbekcha, ruscha, inglizcha
- Tungi/kunduzgi rejim
- Sevimlilar; sharhlarni qo'shish, tahrirlash, o'chirish
- Mobil qurilmalar uchun moslashgan; klaviatura bilan ishlatish mumkin

## Tuzilma
```
pc-compare/
├── frontend/          # sayt
│   ├── index.html     # sahifa
│   ├── style.css      # dizayn (kunduzgi/tungi mavzu)
│   ├── app.js         # asosiy dastur
│   ├── store.js       # ma'lumotlar qatlami (server yoki mahalliy rejim)
│   ├── charts.js      # radar va nuqtali grafiklar (SVG)
│   ├── i18n.js        # tarjimalar (uz/ru/en)
│   └── data.js        # katalog (build.py yaratadi)
├── server/server.py   # backend: statik fayllar + REST API + SQLite
├── database/          # computers.json, computers.sql, build.py (pc.db — avtomatik yaratiladi)
├── tests/test_server.py
├── docs/              # ARXITEKTURA.md, HISOBOT.md
├── run.bat, run.sh
└── README.md
```

## Ma'lumotlar bazasi
- `database/computers.json` — katalogning asosiy manbasi.
- `database/build.py` uni `computers.sql` (SQLite sxemasi) va `frontend/data.js` ga aylantiradi:
  `python3 database/build.py`
- Server birinchi ishga tushganda `computers.sql` dan `database/pc.db` ni yaratadi.
  Bazani boshidan tiklash uchun `database/pc.db` faylini o'chirib, serverni qayta ishga tushiring.

## Testlar
```
python tests/test_server.py
```
(serverning API'sini tekshiradi: sharhlar, ruxsatlar, tekshiruvlar, administrator amallari)

## Muammolar bo'lsa
- **"Python topilmadi"** — Python'ni o'rnating va terminalni qayta oching.
- **"Port band"** — `--port 8080` bilan ishga tushiring.
- **Sayt "mahalliy rejim" deb yozyapti** — siz `index.html` ni to'g'ridan-to'g'ri ochgansiz; server orqali oching.

## Git bilan ishlash
```
git init
git add .
git commit -m "Loyiha"
git branch -M main
git remote add origin <GitHub havolasi>
git push -u origin main
```
