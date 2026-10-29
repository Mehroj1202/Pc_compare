import json, os
H = os.path.dirname(os.path.abspath(__file__))
rows = [
 (1,"Lenovo","IdeaPad Slim 3","Noutbuk","Ofis","AMD Ryzen 5 7530U",6,16,512,"AMD Radeon (integratsiyalangan)",15.6,9,1.62,520,52),
 (2,"ASUS","Vivobook 15","Noutbuk","Ofis","Intel Core i5-1335U",10,16,512,"Intel Iris Xe",15.6,8,1.70,590,58),
 (3,"HP","Pavilion 15","Noutbuk","Ofis","AMD Ryzen 7 7730U",8,16,1000,"AMD Radeon (integratsiyalangan)",15.6,9,1.74,680,64),
 (4,"Acer","Aspire 5","Noutbuk","Ofis","Intel Core i5-1235U",10,8,512,"Intel Iris Xe",15.6,7,1.80,480,48),
 (5,"Apple","MacBook Air 13 (M2)","Noutbuk","Ijod","Apple M2",8,8,256,"Apple 8-yadroli GPU",13.6,15,1.24,999,78),
 (6,"Apple","MacBook Pro 14 (M3 Pro)","Noutbuk","Ijod","Apple M3 Pro",11,18,512,"Apple 14-yadroli GPU",14.2,17,1.61,1999,92),
 (7,"Dell","XPS 13","Noutbuk","Ijod","Intel Core Ultra 7 155H",16,16,512,"Intel Arc",13.4,12,1.19,1299,76),
 (8,"ASUS","ROG Strix G16","Noutbuk","Gaming","Intel Core i7-13650HX",14,16,1000,"NVIDIA RTX 4060 8GB",16,5,2.50,1399,88),
 (9,"Lenovo","Legion 5","Noutbuk","Gaming","AMD Ryzen 7 7745HX",8,16,512,"NVIDIA RTX 4060 8GB",15.6,6,2.40,1249,85),
 (10,"MSI","Katana 15","Noutbuk","Gaming","Intel Core i7-13620H",10,16,512,"NVIDIA RTX 4050 6GB",15.6,5,2.25,1049,78),
 (11,"HP","Pro Tower 290","Stol kompyuteri","Ofis","Intel Core i5-12400",6,8,256,"Intel UHD 730",None,None,5.50,520,60),
 (12,"MSI","MAG Infinite S3","Stol kompyuteri","Gaming","Intel Core i5-13400F",10,16,1000,"NVIDIA RTX 4060 8GB",None,None,7.20,1150,86),
 (13,"Apple","iMac 24 (M3)","Stol kompyuteri","Ijod","Apple M3",8,8,256,"Apple 10-yadroli GPU",23.5,None,4.48,1299,80),
 (14,"Beelink","SER5 Mini PC","Stol kompyuteri","Ofis","AMD Ryzen 5 5560U",6,16,500,"AMD Radeon (integratsiyalangan)",None,None,0.66,330,50),
]
keys = ["id","brand","model","type","purpose","cpu","cores","ram","storage","gpu","screen","battery","weight","price","score"]
pcs = [dict(zip(keys,r)) for r in rows]
rev = {
 1:[("Dilshod",4,"Ofis va o'qish uchun yetarli, narxiga arziydi."),("Madina",4,"Yengil va batareyasi yaxshi ushlaydi.")],
 2:[("Jasur",4,"Ekrani yoqimli, kundalik ish uchun tez ishlaydi."),("Sevara",3,"Korpusi plastmassa, lekin ishlashi yaxshi.")],
 3:[("Aziz",5,"1 TB xotira va Ryzen 7 — narxiga juda yaxshi.")],
 4:[("Bekzod",3,"Arzon, lekin 8 GB xotira tezda yetmay qoladi.")],
 5:[("Nigora",5,"Juda yengil, batareyasi kun bo'yi chidaydi."),("Rustam",4,"Zo'r, faqat 8 GB xotira kamroq.")],
 6:[("Otabek",5,"Video montaj va dasturlash uchun a'lo darajada."),("Zilola",5,"Qimmat, lekin har bir so'mini oqlaydi.")],
 7:[("Sardor",4,"Ixcham va chiroyli, ammo narxi baland.")],
 8:[("Javlon",5,"O'yinlarda yuqori sozlamada barqaror ishlaydi."),("Kamol",4,"Kuchli, lekin og'ir va batareyasi tez tugaydi.")],
 9:[("Sanjar",5,"Sovutish tizimi yaxshi, narx va sifat muvozanati zo'r.")],
 10:[("Eldor",4,"Boshlang'ich gaming uchun yaxshi tanlov.")],
 11:[("Umida",4,"Ofis ishlari uchun ishonchli va barqaror.")],
 12:[("Farrux",5,"Tayyor gaming kompyuter, qo'shimcha sozlash shart emas.")],
 13:[("Malika",5,"Hammasi bitta qurilmada, ekrani juda ravshan.")],
 14:[("Behruz",4,"Kichkina, jim ishlaydi, oddiy vazifalar uchun yetarli.")],
}
for p in pcs:
    p["reviews"]=[{"name":n,"stars":s,"text":t} for n,s,t in rev[p["id"]]]
json.dump(pcs, open(os.path.join(H,"computers.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
open(os.path.join(H,"..","frontend","data.js"),"w",encoding="utf-8").write(
 "// Ma'lumotlar bazasi (database/computers.json dan build.py yordamida yaratiladi)\nconst COMPUTERS = "+json.dumps(pcs,ensure_ascii=False,indent=1)+";\n")
def q(v):
    return "NULL" if v is None else (str(v) if isinstance(v,(int,float)) else "'"+v.replace("'","''")+"'")
sql=["-- Kompyuterlarni taqqoslash sayti: ma'lumotlar bazasi sxemasi (SQLite/MySQL uchun mos)",
"CREATE TABLE computers (\n  id INTEGER PRIMARY KEY,\n  brand TEXT NOT NULL,\n  model TEXT NOT NULL,\n  type TEXT NOT NULL,      -- Noutbuk / Stol kompyuteri\n  purpose TEXT NOT NULL,   -- Ofis / Ijod / Gaming\n  cpu TEXT, cores INTEGER, ram INTEGER, storage INTEGER, gpu TEXT,\n  screen REAL, battery INTEGER, weight REAL, price INTEGER, score INTEGER\n);",
"CREATE TABLE reviews (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  computer_id INTEGER NOT NULL REFERENCES computers(id) ON DELETE CASCADE,\n  author TEXT NOT NULL,\n  stars INTEGER CHECK (stars BETWEEN 1 AND 5),\n  comment TEXT,\n  client_id TEXT,          -- sharh egasini aniqlash uchun (brauzer identifikatori)\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n);",
"CREATE INDEX idx_reviews_computer ON reviews(computer_id);"]
for p in pcs:
    sql.append("INSERT INTO computers VALUES (%s);"%", ".join(q(p[k]) for k in keys))
for p in pcs:
    for r in p["reviews"]:
        sql.append("INSERT INTO reviews (computer_id, author, stars, comment) VALUES (%d, %s, %d, %s);"%(p["id"],q(r["name"]),r["stars"],q(r["text"])))
open(os.path.join(H,"computers.sql"),"w",encoding="utf-8").write("\n".join(sql)+"\n")
print("ok",len(pcs))
