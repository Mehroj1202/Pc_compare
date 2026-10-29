# Mustaqil ish hisoboti (qoralama)

> Bu qoralama loyihaning haqiqiy tuzilishiga asoslangan. Ism-familiya, fan nomi, o'qituvchi va sana
> kabi ma'lumotlarni o'zingiz to'ldiring, matnni o'z so'zlaringiz bilan qayta yozing.

**Mavzu:** "PC Taqqos" — kompyuterlarni taqqoslash veb-sayti
**Bajardi:** ______________  **Tekshirdi:** ______________  **Sana:** ______________

## 1. Maqsad va vazifalar
Maqsad — foydalanuvchiga noutbuk va stol kompyuterlarini xususiyatlari bo'yicha solishtirib, o'ziga mosini
tanlashda yordam beradigan veb-sayt yaratish.

Vazifalar:
1. Kompyuterlar katalogini yaratish va ma'lumotlar bazasida saqlash.
2. Qidiruv, filtr va saralash imkoniyatlarini qo'shish.
3. Bir nechta modelni jadval va grafik ko'rinishida taqqoslash.
4. Foydalanuvchi sharhlari va baholarini qo'shish.
5. Byudjet va ehtiyojga qarab kompyuter tavsiya qiladigan funksiya yaratish.
6. Administrator uchun boshqaruv paneli yaratish.

## 2. Ishlatilgan texnologiyalar
| Qism | Texnologiya | Nima uchun |
|---|---|---|
| Interfeys | HTML5, CSS3, JavaScript (kutubxonasiz) | tez ishlaydi, o'rnatish talab qilinmaydi |
| Grafiklar | SVG (qo'lda chizilgan) | internet va tashqi kutubxona kerak emas |
| Server | Python 3 (`http.server`) | standart kutubxona, o'rnatish shart emas |
| Baza | SQLite | bitta fayl, sozlash kerak emas |
| Tillar | o'zbek, rus, ingliz | ko'proq foydalanuvchi uchun |

## 3. Tizim arxitekturasi
(Sxema va tavsif uchun `ARXITEKTURA.md` ga qarang.) Sayt ikki rejimda ishlaydi: server rejimida ma'lumotlar
SQLite bazasida saqlanadi va barcha foydalanuvchilarga umumiy; serversiz ochilsa, mahalliy rejimda brauzer
xotirasidan foydalanadi.

## 4. Ma'lumotlar bazasi
Ikkita jadval: `computers` (14 ta xususiyat) va `reviews` (sharhlar, `computers` ga tashqi kalit bilan bog'langan).
Batafsil sxema — `ARXITEKTURA.md`, SQL kodi — `database/computers.sql`.

## 5. Amalga oshirilgan funksiyalar
1. Katalog va qidiruv; filtrlar (tur, maqsad, brend, narx, RAM, SSD, ekran, batareya)
2. Saralash (unumdorlik, narx, narx/sifat nisbati, baho)
3. Taqqoslash: eng yaxshi ko'rsatkichni belgilash, farq foizi, radar diagramma, CSV/chop etish, havola orqali ulashish
4. Sevimlilar
5. Sharhlar: qo'shish, tahrirlash, o'chirish (faqat o'z sharhini)
6. "Menga mos kompyuter" tavsiya algoritmi
7. Narx va unumdorlik xaritasi
8. USD/so'm almashtirgichi
9. Uch tilli interfeys, tungi rejim
10. Boshqaruv paneli: kompyuter qo'shish/o'chirish, JSON/CSV eksport, JSON import
11. REST API va administrator autentifikatsiyasi

## 6. Xavfsizlik
XSS'dan himoya (matnni escape qilish), serverda ma'lumotlarni tekshirish, parametrli SQL so'rovlar,
administrator paroli, so'rov hajmini cheklash (batafsil — `ARXITEKTURA.md`).

## 7. Sinov
- Server API uchun avtomatik testlar: `python tests/test_server.py` (9 ta test).
- Qo'lda tekshirilgan holatlar: filtrlar, taqqoslash, sharhlar, til va valyuta almashtirish, mobil ko'rinish.
  (Qo'lda qilgan sinovlaringizni shu yerga o'zingiz yozing.)

## 8. Xulosa va kelajakdagi rejalar
Natijada kompyuter tanlashga yordam beruvchi to'liq ishlaydigan sayt yaratildi. Kelajakda qo'shish mumkin:
haqiqiy do'konlardan narxlarni avtomatik olish, foydalanuvchi ro'yxatdan o'tishi, narx tarixi grafigi,
ko'proq kompyuter modellari.

## Foydalanilgan manbalar
(O'zingiz to'ldiring: MDN Web Docs, Python hujjatlari, SQLite hujjatlari va h.k.)
