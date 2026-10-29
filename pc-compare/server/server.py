#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PC Taqqos serveri.

Faqat Python standart kutubxonasi ishlatiladi: hech narsa o'rnatish shart emas.

Ishga tushirish:
    python server/server.py            (Windows: py server\\server.py)
Keyin brauzerda http://localhost:8000 ochiladi.

Server nima qiladi:
  * frontend/ papkasidagi saytni uzatadi;
  * SQLite bazasi (database/pc.db) bilan ishlaydi. Baza birinchi ishga tushishda
    database/computers.sql faylidan avtomatik yaratiladi;
  * REST API: /api/computers, /api/reviews, /api/login.

Administrator paroli: ADMIN_PASSWORD muhit o'zgaruvchisi (standart: admin123).
"""
import argparse
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.join(ROOT, "frontend")
DB_DIR = os.path.join(ROOT, "database")
DB_PATH = os.environ.get("PC_DB") or os.path.join(DB_DIR, "pc.db")
SCHEMA_SQL = os.path.join(DB_DIR, "computers.sql")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

MAX_BODY = 64 * 1024
MAX_REVIEWS_PER_CLIENT = 5
TYPES = ("Noutbuk", "Stol kompyuteri")
PURPOSES = ("Ofis", "Ijod", "Gaming")
CLIENT_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")

TOKENS = set()
TOKENS_LOCK = threading.Lock()

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
}


# ---------------------------------------------------------------- baza

def connect():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    folder = os.path.dirname(DB_PATH)
    if folder:
        os.makedirs(folder, exist_ok=True)
    con = connect()
    try:
        has = con.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'computers'"
        ).fetchone()
        if not has:
            with open(SCHEMA_SQL, encoding="utf-8") as f:
                con.executescript(f.read())
            con.commit()
    finally:
        con.close()


# ---------------------------------------------------------------- tekshiruv

class ApiError(Exception):
    def __init__(self, status, code, message=""):
        super().__init__(message or code)
        self.status = status
        self.code = code
        self.message = message or code


def _str(d, key, maxlen):
    v = d.get(key)
    if not isinstance(v, str) or not v.strip() or len(v.strip()) > maxlen:
        raise ApiError(400, "invalid", "%s: noto'g'ri qiymat" % key)
    return v.strip()


def _num(d, key, lo, hi, integer=False, optional=False):
    v = d.get(key)
    if v is None or v == "":
        if optional:
            return None
        raise ApiError(400, "invalid", "%s: kiritilishi shart" % key)
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise ApiError(400, "invalid", "%s: son bo'lishi kerak" % key)
    if not (lo <= v <= hi):
        raise ApiError(400, "invalid", "%s: %s dan %s gacha bo'lishi kerak" % (key, lo, hi))
    if integer:
        if int(v) != v:
            raise ApiError(400, "invalid", "%s: butun son bo'lishi kerak" % key)
        return int(v)
    return float(v)


def clean_computer(d):
    typ = d.get("type")
    purpose = d.get("purpose")
    if typ not in TYPES:
        raise ApiError(400, "invalid", "type: noto'g'ri qiymat")
    if purpose not in PURPOSES:
        raise ApiError(400, "invalid", "purpose: noto'g'ri qiymat")
    return {
        "brand": _str(d, "brand", 40),
        "model": _str(d, "model", 60),
        "type": typ,
        "purpose": purpose,
        "cpu": _str(d, "cpu", 80),
        "cores": _num(d, "cores", 1, 128, integer=True),
        "ram": _num(d, "ram", 1, 1024, integer=True),
        "storage": _num(d, "storage", 1, 100000, integer=True),
        "gpu": _str(d, "gpu", 80),
        "screen": _num(d, "screen", 5, 100, optional=True),
        "battery": _num(d, "battery", 0, 100, integer=True, optional=True),
        "weight": _num(d, "weight", 0.1, 100),
        "price": _num(d, "price", 1, 1000000, integer=True),
        "score": _num(d, "score", 0, 100, integer=True),
    }


def clean_review(d):
    stars = d.get("stars")
    if isinstance(stars, bool) or not isinstance(stars, int) or not 1 <= stars <= 5:
        raise ApiError(400, "invalid", "stars: 1 dan 5 gacha bo'lishi kerak")
    return {"name": _str(d, "name", 30), "stars": stars, "text": _str(d, "text", 300)}


# ---------------------------------------------------------------- so'rovlar

def list_computers(con, client_id):
    comps = [dict(r) for r in con.execute("SELECT * FROM computers ORDER BY id")]
    by_id = {}
    for c in comps:
        c["reviews"] = []
        by_id[c["id"]] = c
    rows = con.execute(
        "SELECT id, computer_id, author, stars, comment, client_id FROM reviews ORDER BY id"
    )
    for r in rows:
        c = by_id.get(r["computer_id"])
        if c is not None:
            c["reviews"].append({
                "rid": r["id"],
                "name": r["author"],
                "stars": r["stars"],
                "text": r["comment"] or "",
                "mine": bool(client_id and r["client_id"] == client_id),
            })
    return comps


COMPUTER_COLS = ("brand", "model", "type", "purpose", "cpu", "cores", "ram",
                 "storage", "gpu", "screen", "battery", "weight", "price", "score")


class Handler(BaseHTTPRequestHandler):
    server_version = "PCTaqqos/1.0"

    # -- yordamchilar
    def log_message(self, fmt, *args):
        if getattr(self.server, "verbose", False):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, status, body, ctype, cache="no-store"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise ApiError(400, "invalid", "Content-Length noto'g'ri")
        if length > MAX_BODY:
            raise ApiError(413, "too_large", "So'rov juda katta")
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "invalid", "JSON noto'g'ri")
        if not isinstance(data, dict):
            raise ApiError(400, "invalid", "JSON obyekt bo'lishi kerak")
        return data

    def _client_id(self):
        v = self.headers.get("X-Client-Id", "")
        return v if CLIENT_RE.match(v) else None

    def _is_admin(self):
        h = self.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            with TOKENS_LOCK:
                return h[7:] in TOKENS
        return False

    def _require_admin(self):
        if not self._is_admin():
            raise ApiError(401, "unauthorized", "Administrator huquqi kerak")

    # -- yo'naltirish
    def _dispatch(self):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            try:
                self._api(self.command, path.rstrip("/"))
            except ApiError as e:
                self._json(e.status, {"error": e.message, "code": e.code})
            except sqlite3.Error:
                traceback.print_exc()
                self._json(500, {"error": "Ma'lumotlar bazasi xatosi", "code": "db"})
            except Exception:
                traceback.print_exc()
                self._json(500, {"error": "Ichki xatolik", "code": "server"})
        elif self.command in ("GET", "HEAD"):
            self._static(path)
        else:
            self._json(405, {"error": "Metod ruxsat etilmagan", "code": "method"})

    do_GET = do_HEAD = do_POST = do_PUT = do_DELETE = _dispatch

    # -- API
    def _api(self, method, path):
        if path == "/api/health" and method == "GET":
            return self._json(200, {"ok": True})

        if path == "/api/login" and method == "POST":
            data = self._body()
            pw = data.get("password")
            ok = isinstance(pw, str) and secrets.compare_digest(
                pw.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8"))
            if not ok:
                time.sleep(0.4)
                raise ApiError(401, "unauthorized", "Parol noto'g'ri")
            token = secrets.token_hex(16)
            with TOKENS_LOCK:
                if len(TOKENS) > 100:
                    TOKENS.clear()
                TOKENS.add(token)
            return self._json(200, {"token": token})

        if path == "/api/computers":
            if method == "GET":
                con = connect()
                try:
                    return self._json(200, list_computers(con, self._client_id()))
                finally:
                    con.close()
            if method == "POST":
                self._require_admin()
                c = clean_computer(self._body())
                con = connect()
                try:
                    dup = con.execute(
                        "SELECT 1 FROM computers WHERE lower(brand) = lower(?) AND lower(model) = lower(?)",
                        (c["brand"], c["model"])).fetchone()
                    if dup:
                        raise ApiError(409, "duplicate", "Bunday model allaqachon mavjud")
                    cur = con.execute(
                        "INSERT INTO computers (%s) VALUES (%s)" % (
                            ", ".join(COMPUTER_COLS), ", ".join("?" * len(COMPUTER_COLS))),
                        [c[k] for k in COMPUTER_COLS])
                    con.commit()
                    return self._json(201, {"id": cur.lastrowid})
                finally:
                    con.close()

        m = re.fullmatch(r"/api/computers/(\d+)", path)
        if m and method == "DELETE":
            self._require_admin()
            con = connect()
            try:
                cur = con.execute("DELETE FROM computers WHERE id = ?", (int(m.group(1)),))
                con.commit()
                if cur.rowcount == 0:
                    raise ApiError(404, "not_found", "Topilmadi")
                return self._json(200, {"ok": True})
            finally:
                con.close()

        m = re.fullmatch(r"/api/computers/(\d+)/reviews", path)
        if m and method == "POST":
            pc_id = int(m.group(1))
            client_id = self._client_id()
            if not client_id:
                raise ApiError(400, "invalid", "X-Client-Id sarlavhasi kerak")
            r = clean_review(self._body())
            con = connect()
            try:
                if not con.execute("SELECT 1 FROM computers WHERE id = ?", (pc_id,)).fetchone():
                    raise ApiError(404, "not_found", "Kompyuter topilmadi")
                n = con.execute(
                    "SELECT COUNT(*) FROM reviews WHERE computer_id = ? AND client_id = ?",
                    (pc_id, client_id)).fetchone()[0]
                if n >= MAX_REVIEWS_PER_CLIENT:
                    raise ApiError(429, "too_many", "Juda ko'p sharh yuborildi")
                cur = con.execute(
                    "INSERT INTO reviews (computer_id, author, stars, comment, client_id) VALUES (?, ?, ?, ?, ?)",
                    (pc_id, r["name"], r["stars"], r["text"], client_id))
                con.commit()
                return self._json(201, {"rid": cur.lastrowid})
            finally:
                con.close()

        m = re.fullmatch(r"/api/reviews/(\d+)", path)
        if m and method in ("PUT", "DELETE"):
            rid = int(m.group(1))
            client_id = self._client_id()
            admin = self._is_admin()
            data = self._body() if method == "PUT" else None
            con = connect()
            try:
                row = con.execute("SELECT client_id FROM reviews WHERE id = ?", (rid,)).fetchone()
                if not row:
                    raise ApiError(404, "not_found", "Sharh topilmadi")
                owner = bool(client_id and row["client_id"] == client_id)
                if not (owner or admin):
                    raise ApiError(403, "forbidden", "Bu sharh sizniki emas")
                if method == "PUT":
                    r = clean_review(data)
                    con.execute("UPDATE reviews SET author = ?, stars = ?, comment = ? WHERE id = ?",
                                (r["name"], r["stars"], r["text"], rid))
                else:
                    con.execute("DELETE FROM reviews WHERE id = ?", (rid,))
                con.commit()
                return self._json(200, {"ok": True})
            finally:
                con.close()

        raise ApiError(404, "not_found", "Manzil topilmadi")

    # -- statik fayllar
    def _static(self, path):
        try:
            rel = unquote(path).lstrip("/\\") or "index.html"
            full = os.path.normpath(os.path.join(FRONTEND, rel))
            if os.path.commonpath([full, FRONTEND]) != FRONTEND:
                return self._send(403, b"Forbidden", "text/plain; charset=utf-8")
            if os.path.isdir(full):
                full = os.path.join(full, "index.html")
            if not os.path.isfile(full):
                return self._send(404, b"Not found", "text/plain; charset=utf-8")
            with open(full, "rb") as f:
                body = f.read()
        except (ValueError, OSError):
            return self._send(404, b"Not found", "text/plain; charset=utf-8")
        ext = os.path.splitext(full)[1].lower()
        ctype = CONTENT_TYPES.get(ext) or mimetypes.guess_type(full)[0] or "application/octet-stream"
        self._send(200, body, ctype, cache="no-cache")


def make_server(host, port):
    init_db()
    return ThreadingHTTPServer((host, port), Handler)


def main():
    ap = argparse.ArgumentParser(description="PC Taqqos serveri")
    ap.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    ap.add_argument("--no-browser", action="store_true", help="brauzerni avtomatik ochmaslik")
    ap.add_argument("-v", "--verbose", action="store_true", help="har bir so'rovni chiqarish")
    args = ap.parse_args()

    try:
        httpd = make_server(args.host, args.port)
    except OSError as e:
        print("Xato: %s:%d manzilini ochib bo'lmadi (%s)." % (args.host, args.port, e))
        print("Boshqa port bilan urinib ko'ring:  python server/server.py --port 8080")
        sys.exit(1)
    httpd.verbose = args.verbose

    url = "http://%s:%d" % ("localhost" if args.host in ("127.0.0.1", "0.0.0.0") else args.host, args.port)
    print("PC Taqqos serveri ishga tushdi: " + url)
    print("Baza fayli: " + DB_PATH)
    print("Administrator paroli: %s (ADMIN_PASSWORD orqali o'zgartiriladi)" % (
        "admin123" if ADMIN_PASSWORD == "admin123" else "o'zgartirilgan"))
    print("To'xtatish: Ctrl+C")
    if not args.no_browser:
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nTo'xtatildi.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
