# Arxitektura

## Umumiy sxema
```
 Brauzer (frontend/)                         Server (server/server.py)
 ┌───────────────────────────┐   HTTP/JSON   ┌──────────────────────────┐
 │ index.html + style.css    │ ────────────▶ │ /            statik fayllar│
 │ app.js   (interfeys)      │               │ /api/...     REST API      │
 │ store.js (ma'lumotlar)    │ ◀──────────── │        │                   │
 │ charts.js, i18n.js        │               │        ▼                   │
 └───────────────────────────┘               │  database/pc.db (SQLite)   │
        │ server yo'q bo'lsa                 └──────────────────────────┘
        ▼
  data.js + localStorage  (mahalliy rejim)
```

## Ikki rejim
`store.js` sayt ochilganda `GET api/computers` so'rovini yuboradi:
- javob keldi → **server rejimi**: kompyuterlar va sharhlar SQLite'dan olinadi va yoziladi;
- javob kelmadi (fayl to'g'ridan-to'g'ri ochilgan yoki oddiy statik hosting) → **mahalliy rejim**:
  katalog `data.js` dan, foydalanuvchi ma'lumotlari `localStorage` dan olinadi.

Interfeys (`app.js`) ikki rejimni farqlamaydi: u faqat `Store` obyektining metodlarini chaqiradi
(`addReview`, `updateReview`, `deleteReview`, `addComputer`, `deleteComputer`, `login`).

## Ma'lumotlar bazasi (SQLite)
```
computers(id PK, brand, model, type, purpose, cpu, cores, ram, storage, gpu,
          screen, battery, weight, price, score)
reviews(id PK, computer_id FK -> computers.id ON DELETE CASCADE,
        author, stars 1..5, comment, client_id, created_at)
```
`client_id` — brauzer yaratgan tasodifiy identifikator. Sharhni faqat uning egasi (yoki administrator)
tahrirlay/o'chira oladi. Kompyuter o'chirilsa, uning sharhlari ham o'chadi (CASCADE).

## REST API
| Metod | Manzil | Huquq | Vazifa |
|---|---|---|---|
| GET | `/api/computers` | hamma | kompyuterlar va sharhlar (`mine` — sharh sizniki ekanini bildiradi) |
| POST | `/api/computers` | admin | yangi kompyuter qo'shish |
| DELETE | `/api/computers/{id}` | admin | kompyuterni o'chirish |
| POST | `/api/computers/{id}/reviews` | hamma | sharh qo'shish (bir kompyuterga 5 tagacha) |
| PUT | `/api/reviews/{id}` | egasi yoki admin | sharhni tahrirlash |
| DELETE | `/api/reviews/{id}` | egasi yoki admin | sharhni o'chirish |
| POST | `/api/login` | — | parol bo'yicha administrator tokenini olish |
| GET | `/api/health` | — | server ishlayotganini tekshirish |

Xatolar `{"error": "...", "code": "..."}` ko'rinishida qaytadi (`invalid`, `unauthorized`, `forbidden`,
`not_found`, `duplicate`, `too_many`, `too_large`).

## Xavfsizlik choralari
- Foydalanuvchi matni sahifaga `esc()` orqali chiqariladi (HTML ichiga kod kiritib bo'lmaydi: XSS).
- Server barcha kiruvchi ma'lumotni tekshiradi (turi, oraliq, uzunlik); SQL so'rovlar parametrli (SQL injection yo'q).
- So'rov hajmi 64 KB bilan cheklangan; statik fayllarda papkadan chiqib ketish (`../`) taqiqlangan.
- Administrator paroli solishtirish vaqt bo'yicha bir xil (`secrets.compare_digest`); noto'g'ri urinishda kechikish.
- CSV eksportda Excel formulalaridan himoya (`=`, `+`, `@` bilan boshlangan matnga `'` qo'shiladi).

## Frontend modullari
| Fayl | Vazifa |
|---|---|
| `i18n.js` | tarjimalar `t("kalit")`, `tx("type", qiymat)` |
| `store.js` | server/mahalliy rejim, `localStorage`, API so'rovlari |
| `charts.js` | radar va nuqtali diagramma (sof SVG, tashqi kutubxonasiz) |
| `app.js` | filtrlar, kartalar, taqqoslash, tavsiya, xarita, boshqaruv paneli |

## "Menga mos kompyuter" algoritmi
Byudjet, maqsad va tur bo'yicha model tanlanadi, so'ng har biriga 0–1 oralig'ida uchta baho beriladi:
unumdorlik (`score/100`), qiymat (`score/narx`, katalogdagi eng yaxshisiga nisbatan) va ko'chmalik
(batareya va yengillik o'rtachasi). Foydalanuvchi belgilagan muhimlik darajalari (0–10) vazn sifatida ishlatiladi:

`moslik = (w1·unumdorlik + w2·qiymat + w3·ko'chmalik) / (w1 + w2 + w3)`

Eng yuqori 3 tasi foizda ko'rsatiladi.
