-- Kompyuterlarni taqqoslash sayti: ma'lumotlar bazasi sxemasi (SQLite/MySQL uchun mos)
CREATE TABLE computers (
  id INTEGER PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT NOT NULL,      -- Noutbuk / Stol kompyuteri
  purpose TEXT NOT NULL,   -- Ofis / Ijod / Gaming
  cpu TEXT, cores INTEGER, ram INTEGER, storage INTEGER, gpu TEXT,
  screen REAL, battery INTEGER, weight REAL, price INTEGER, score INTEGER
);
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  computer_id INTEGER NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  client_id TEXT,          -- sharh egasini aniqlash uchun (brauzer identifikatori)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reviews_computer ON reviews(computer_id);
INSERT INTO computers VALUES (1, 'Lenovo', 'IdeaPad Slim 3', 'Noutbuk', 'Ofis', 'AMD Ryzen 5 7530U', 6, 16, 512, 'AMD Radeon (integratsiyalangan)', 15.6, 9, 1.62, 520, 52);
INSERT INTO computers VALUES (2, 'ASUS', 'Vivobook 15', 'Noutbuk', 'Ofis', 'Intel Core i5-1335U', 10, 16, 512, 'Intel Iris Xe', 15.6, 8, 1.7, 590, 58);
INSERT INTO computers VALUES (3, 'HP', 'Pavilion 15', 'Noutbuk', 'Ofis', 'AMD Ryzen 7 7730U', 8, 16, 1000, 'AMD Radeon (integratsiyalangan)', 15.6, 9, 1.74, 680, 64);
INSERT INTO computers VALUES (4, 'Acer', 'Aspire 5', 'Noutbuk', 'Ofis', 'Intel Core i5-1235U', 10, 8, 512, 'Intel Iris Xe', 15.6, 7, 1.8, 480, 48);
INSERT INTO computers VALUES (5, 'Apple', 'MacBook Air 13 (M2)', 'Noutbuk', 'Ijod', 'Apple M2', 8, 8, 256, 'Apple 8-yadroli GPU', 13.6, 15, 1.24, 999, 78);
INSERT INTO computers VALUES (6, 'Apple', 'MacBook Pro 14 (M3 Pro)', 'Noutbuk', 'Ijod', 'Apple M3 Pro', 11, 18, 512, 'Apple 14-yadroli GPU', 14.2, 17, 1.61, 1999, 92);
INSERT INTO computers VALUES (7, 'Dell', 'XPS 13', 'Noutbuk', 'Ijod', 'Intel Core Ultra 7 155H', 16, 16, 512, 'Intel Arc', 13.4, 12, 1.19, 1299, 76);
INSERT INTO computers VALUES (8, 'ASUS', 'ROG Strix G16', 'Noutbuk', 'Gaming', 'Intel Core i7-13650HX', 14, 16, 1000, 'NVIDIA RTX 4060 8GB', 16, 5, 2.5, 1399, 88);
INSERT INTO computers VALUES (9, 'Lenovo', 'Legion 5', 'Noutbuk', 'Gaming', 'AMD Ryzen 7 7745HX', 8, 16, 512, 'NVIDIA RTX 4060 8GB', 15.6, 6, 2.4, 1249, 85);
INSERT INTO computers VALUES (10, 'MSI', 'Katana 15', 'Noutbuk', 'Gaming', 'Intel Core i7-13620H', 10, 16, 512, 'NVIDIA RTX 4050 6GB', 15.6, 5, 2.25, 1049, 78);
INSERT INTO computers VALUES (11, 'HP', 'Pro Tower 290', 'Stol kompyuteri', 'Ofis', 'Intel Core i5-12400', 6, 8, 256, 'Intel UHD 730', NULL, NULL, 5.5, 520, 60);
INSERT INTO computers VALUES (12, 'MSI', 'MAG Infinite S3', 'Stol kompyuteri', 'Gaming', 'Intel Core i5-13400F', 10, 16, 1000, 'NVIDIA RTX 4060 8GB', NULL, NULL, 7.2, 1150, 86);
INSERT INTO computers VALUES (13, 'Apple', 'iMac 24 (M3)', 'Stol kompyuteri', 'Ijod', 'Apple M3', 8, 8, 256, 'Apple 10-yadroli GPU', 23.5, NULL, 4.48, 1299, 80);
INSERT INTO computers VALUES (14, 'Beelink', 'SER5 Mini PC', 'Stol kompyuteri', 'Ofis', 'AMD Ryzen 5 5560U', 6, 16, 500, 'AMD Radeon (integratsiyalangan)', NULL, NULL, 0.66, 330, 50);
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (1, 'Dilshod', 4, 'Ofis va o''qish uchun yetarli, narxiga arziydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (1, 'Madina', 4, 'Yengil va batareyasi yaxshi ushlaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (2, 'Jasur', 4, 'Ekrani yoqimli, kundalik ish uchun tez ishlaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (2, 'Sevara', 3, 'Korpusi plastmassa, lekin ishlashi yaxshi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (3, 'Aziz', 5, '1 TB xotira va Ryzen 7 — narxiga juda yaxshi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (4, 'Bekzod', 3, 'Arzon, lekin 8 GB xotira tezda yetmay qoladi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (5, 'Nigora', 5, 'Juda yengil, batareyasi kun bo''yi chidaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (5, 'Rustam', 4, 'Zo''r, faqat 8 GB xotira kamroq.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (6, 'Otabek', 5, 'Video montaj va dasturlash uchun a''lo darajada.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (6, 'Zilola', 5, 'Qimmat, lekin har bir so''mini oqlaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (7, 'Sardor', 4, 'Ixcham va chiroyli, ammo narxi baland.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (8, 'Javlon', 5, 'O''yinlarda yuqori sozlamada barqaror ishlaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (8, 'Kamol', 4, 'Kuchli, lekin og''ir va batareyasi tez tugaydi.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (9, 'Sanjar', 5, 'Sovutish tizimi yaxshi, narx va sifat muvozanati zo''r.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (10, 'Eldor', 4, 'Boshlang''ich gaming uchun yaxshi tanlov.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (11, 'Umida', 4, 'Ofis ishlari uchun ishonchli va barqaror.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (12, 'Farrux', 5, 'Tayyor gaming kompyuter, qo''shimcha sozlash shart emas.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (13, 'Malika', 5, 'Hammasi bitta qurilmada, ekrani juda ravshan.');
INSERT INTO reviews (computer_id, author, stars, comment) VALUES (14, 'Behruz', 4, 'Kichkina, jim ishlaydi, oddiy vazifalar uchun yetarli.');
