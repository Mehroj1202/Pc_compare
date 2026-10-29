# -*- coding: utf-8 -*-
"""Server API testlari.  Ishga tushirish:  python tests/test_server.py"""
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

TMP = tempfile.mkdtemp(prefix="pc-test-")
os.environ["PC_DB"] = os.path.join(TMP, "test.db")
os.environ["ADMIN_PASSWORD"] = "test-pass"
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server"))
import server  # noqa: E402

CLIENT_A = "client-aaaaaaaa"
CLIENT_B = "client-bbbbbbbb"

NEW_PC = {
    "brand": "Test", "model": "Model X", "type": "Noutbuk", "purpose": "Ofis",
    "cpu": "CPU 1", "cores": 4, "ram": 8, "storage": 256, "gpu": "GPU 1",
    "screen": 14, "battery": 10, "weight": 1.4, "price": 700, "score": 55,
}


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.make_server("127.0.0.1", 0)
        cls.base = "http://127.0.0.1:%d" % cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def call(self, method, path, body=None, client=None, token=None):
        headers = {}
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if client:
            headers["X-Client-Id"] = client
        if token:
            headers["Authorization"] = "Bearer " + token
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                raw = r.read()
                return r.status, (json.loads(raw) if raw and "json" in r.headers.get("Content-Type", "") else raw)
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, raw

    def login(self):
        status, data = self.call("POST", "/api/login", {"password": "test-pass"})
        self.assertEqual(status, 200)
        return data["token"]

    # -- testlar
    def test_01_list_seed(self):
        status, data = self.call("GET", "/api/computers")
        self.assertEqual(status, 200)
        self.assertEqual(len(data), 14)
        self.assertTrue(all(isinstance(c["reviews"], list) for c in data))
        self.assertTrue(any(c["reviews"] for c in data))

    def test_02_static_pages(self):
        status, body = self.call("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"PC Taqqos", body)
        status, _ = self.call("GET", "/app.js")
        self.assertEqual(status, 200)
        status, _ = self.call("GET", "/nope.html")
        self.assertEqual(status, 404)
        status, _ = self.call("GET", "/..%2f..%2fserver%2fserver.py")
        self.assertIn(status, (403, 404))

    def test_03_review_lifecycle(self):
        path = "/api/computers/1/reviews"
        review = {"name": "Tester", "stars": 4, "text": "Yaxshi"}
        status, data = self.call("POST", path, review, client=CLIENT_A)
        self.assertEqual(status, 201)
        rid = data["rid"]

        # egasi ko'radi: mine=True; boshqasi uchun False
        _, comps = self.call("GET", "/api/computers", client=CLIENT_A)
        mine = [r for r in comps[0]["reviews"] if r["rid"] == rid][0]
        self.assertTrue(mine["mine"])
        _, comps = self.call("GET", "/api/computers", client=CLIENT_B)
        other = [r for r in comps[0]["reviews"] if r["rid"] == rid][0]
        self.assertFalse(other["mine"])

        # begona o'zgartira/o'chira olmaydi
        status, _ = self.call("PUT", "/api/reviews/%d" % rid, review, client=CLIENT_B)
        self.assertEqual(status, 403)
        status, _ = self.call("DELETE", "/api/reviews/%d" % rid, client=CLIENT_B)
        self.assertEqual(status, 403)

        # egasi tahrirlaydi va o'chiradi
        status, _ = self.call("PUT", "/api/reviews/%d" % rid,
                              {"name": "Tester", "stars": 5, "text": "Zo'r"}, client=CLIENT_A)
        self.assertEqual(status, 200)
        _, comps = self.call("GET", "/api/computers", client=CLIENT_A)
        updated = [r for r in comps[0]["reviews"] if r["rid"] == rid][0]
        self.assertEqual((updated["stars"], updated["text"]), (5, "Zo'r"))
        status, _ = self.call("DELETE", "/api/reviews/%d" % rid, client=CLIENT_A)
        self.assertEqual(status, 200)
        status, _ = self.call("DELETE", "/api/reviews/%d" % rid, client=CLIENT_A)
        self.assertEqual(status, 404)

    def test_04_review_validation(self):
        path = "/api/computers/2/reviews"
        for bad in (
            {"name": "", "stars": 4, "text": "x"},
            {"name": "A", "stars": 6, "text": "x"},
            {"name": "A", "stars": "5", "text": "x"},
            {"name": "A", "stars": 4, "text": "x" * 301},
            {"name": "A", "stars": True, "text": "x"},
        ):
            status, data = self.call("POST", path, bad, client=CLIENT_A)
            self.assertEqual(status, 400, bad)
            self.assertEqual(data["code"], "invalid")
        status, _ = self.call("POST", path, {"name": "A", "stars": 4, "text": "x"})
        self.assertEqual(status, 400)  # X-Client-Id yo'q
        status, _ = self.call("POST", "/api/computers/9999/reviews",
                              {"name": "A", "stars": 4, "text": "x"}, client=CLIENT_A)
        self.assertEqual(status, 404)

    def test_05_review_limit(self):
        path = "/api/computers/3/reviews"
        codes = [self.call("POST", path, {"name": "A", "stars": 3, "text": "t%d" % i},
                           client="client-limit01")[0] for i in range(server.MAX_REVIEWS_PER_CLIENT + 1)]
        self.assertEqual(codes[:-1], [201] * server.MAX_REVIEWS_PER_CLIENT)
        self.assertEqual(codes[-1], 429)

    def test_06_admin_required(self):
        status, _ = self.call("POST", "/api/computers", NEW_PC)
        self.assertEqual(status, 401)
        status, _ = self.call("DELETE", "/api/computers/1")
        self.assertEqual(status, 401)
        status, _ = self.call("POST", "/api/login", {"password": "wrong"})
        self.assertEqual(status, 401)
        status, _ = self.call("POST", "/api/computers", NEW_PC, token="fake-token")
        self.assertEqual(status, 401)

    def test_07_admin_computer_lifecycle(self):
        token = self.login()
        status, data = self.call("POST", "/api/computers", NEW_PC, token=token)
        self.assertEqual(status, 201)
        new_id = data["id"]
        status, data = self.call("POST", "/api/computers", NEW_PC, token=token)
        self.assertEqual(status, 409)  # takror
        bad = dict(NEW_PC, model="Boshqa", price=-5)
        status, data = self.call("POST", "/api/computers", bad, token=token)
        self.assertEqual(status, 400)
        bad = dict(NEW_PC, model="Boshqa2", type="Telefon")
        status, _ = self.call("POST", "/api/computers", bad, token=token)
        self.assertEqual(status, 400)

        # sharh qo'shib, kompyuterni o'chiramiz: sharh ham o'chadi (CASCADE)
        self.call("POST", "/api/computers/%d/reviews" % new_id,
                  {"name": "A", "stars": 4, "text": "x"}, client=CLIENT_A)
        status, _ = self.call("DELETE", "/api/computers/%d" % new_id, token=token)
        self.assertEqual(status, 200)
        _, comps = self.call("GET", "/api/computers")
        self.assertNotIn(new_id, [c["id"] for c in comps])
        status, _ = self.call("DELETE", "/api/computers/%d" % new_id, token=token)
        self.assertEqual(status, 404)

    def test_08_admin_can_delete_foreign_review(self):
        token = self.login()
        _, data = self.call("POST", "/api/computers/4/reviews",
                            {"name": "A", "stars": 2, "text": "x"}, client=CLIENT_A)
        status, _ = self.call("DELETE", "/api/reviews/%d" % data["rid"], token=token)
        self.assertEqual(status, 200)

    def test_09_bad_json_and_unknown(self):
        req = urllib.request.Request(self.base + "/api/login", data=b"{not json", method="POST",
                                     headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=10)
        self.assertEqual(ctx.exception.code, 400)
        status, _ = self.call("GET", "/api/unknown")
        self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
