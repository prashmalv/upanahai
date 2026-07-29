"""Whole-application sanity sweep.

Walks every public page, every API, and the real user journeys — sign up, search,
measure, ask, answer, review, wishlist, change password, admin — and reports
anything a customer would notice. Run against local or production.

    python3 sanity.py http://localhost:3007 [admin-password]
"""
import json, random, re, sys, time, urllib.error, urllib.parse, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3007").rstrip("/")
ADMIN_PW = sys.argv[2] if len(sys.argv) > 2 else None

problems: list[tuple[str, str]] = []
checks = 0


class Client:
    def __init__(self):
        self.cookies: dict[str, str] = {}

    def _store(self, headers):
        for v in headers.get_all("Set-Cookie") or []:
            pair = v.split(";")[0]
            if "=" in pair:
                k, val = pair.split("=", 1)
                self.cookies[k.strip()] = val.strip()

    def go(self, path, payload=None, method=None, follow=True):
        data = json.dumps(payload).encode() if payload is not None else None
        # Ask not to be counted. Every run of this suite searches, scans and clicks
        # its way across the site; without this each run lands in the analytics as a
        # fresh visitor, and enough runs make the public demand board publish
        # "trends" that are entirely our own test traffic.
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "UpanahSanity/1.0",
            "x-upanah-sanity": "1"
        }
        if self.cookies:
            headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        req = urllib.request.Request(BASE + path, data=data, headers=headers,
                                     method=method or ("POST" if data else "GET"))

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **kw):
                return None

        opener = urllib.request.build_opener(*([] if follow else [NoRedirect]))

        # Retry connection-level failures, never HTTP ones.
        #
        # urllib opens a fresh TCP+TLS connection per request and, at this
        # volume, macOS intermittently returns ECONNREFUSED / times out — a
        # client-side artefact, not the server. Measured side by side: 60 curl
        # requests to the same URL all succeeded while urllib failed 11 of 60.
        # Without this the suite reports the application as broken when it isn't,
        # which is worse than no test at all.
        last = None
        for attempt in range(4):
            try:
                r = opener.open(req, timeout=120)
                self._store(r.headers)
                return r.status, r.read().decode("utf-8", "replace"), r.geturl()
            except urllib.error.HTTPError as e:
                self._store(e.headers)
                return e.code, e.read().decode("utf-8", "replace"), e.headers.get("Location", "") or e.url
            except Exception as e:
                last = e
                time.sleep(0.4 * (attempt + 1))
        return 0, f"{type(last).__name__}: {last}", ""

    def page(self, path):
        """HTML with Next's SSR comment markers removed.

        React SSR emits `UK <!-- -->8.5` between static text and an interpolated
        value. A browser renders "UK 8.5"; a naive substring match on the raw
        HTML does not. Strip them so assertions test what users actually see."""
        st, body, url = self.go(path)
        return st, re.sub(r"<!--.*?-->", "", body), url


def ok(label, cond, detail=""):
    global checks
    checks += 1
    if not cond:
        problems.append((label, detail))
        print(f"  FAIL  {label}" + (f"   [{detail[:150]}]" if detail else ""))
    else:
        print(f"  ok    {label}")


def text_of(html):
    t = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", t)


anon = Client()
tag = random.randint(100000, 999999)

# ---------------------------------------------------------------- public pages
print("\n=== public pages render, no error text, no broken images ===")
PAGES = ["/", "/data-and-privacy", "/foot-health", "/search", "/search?q=running+shoes+under+4000", "/search?category=walking",
         "/search?gender=kids", "/foot-scan", "/size-chart", "/size-chart?mm=267",
         "/match", "/try-on", "/health", "/brands", "/community",
         "/community?kind=find", "/community?kind=advice", "/login"]
for p in PAGES:
    st, body, _ = anon.go(p)
    ok(f"GET {p}", st == 200, f"status {st}")
    if st == 200:
        low = text_of(body).lower()
        for bad in ["application error", "internal server error", "unhandled",
                    "cannot read propert", "undefined is not", "nan ", "null null"]:
            if bad in low:
                ok(f"{p} free of '{bad.strip()}'", False, bad)
        # every product card must carry an image url
        imgs = re.findall(r'<img[^>]+src="([^"]*)"', body)
        ok(f"{p}: no empty img src", all(s.strip() for s in imgs), f"{sum(1 for s in imgs if not s.strip())} empty")

print("\n=== a product detail page ===")
st, body, _ = anon.go("/api/products")
prods = json.loads(body)["products"] if st == 200 else []
ok("GET /api/products", st == 200 and len(prods) > 0, f"status {st}")
if prods:
    slug = prods[0]["slug"]
    st, body, _ = anon.go(f"/product/{slug}")
    ok(f"GET /product/{slug}", st == 200, f"status {st}")
    ok("product page has price", "₹" in body)
    ok("product page has Product schema", '"@type":"Product"' in body.replace(" ", ""))
    st, _, _ = anon.go("/product/definitely-not-a-real-slug")
    ok("unknown product 404s", st == 404, f"status {st}")

print("\n=== SEO surface ===")
for p, needle in [("/robots.txt", "Sitemap"), ("/sitemap.xml", "<loc>"), ("/llms.txt", "Upanah")]:
    st, body, _ = anon.go(p)
    ok(f"GET {p}", st == 200 and needle in body, f"status {st}")
st, body, _ = anon.go("/sitemap.xml")
locs = re.findall(r"<loc>([^<]+)</loc>", body)
if "localhost" not in BASE:
    ok("sitemap uses the public domain", not any("localhost" in l for l in locs), str(locs[:2]))

print("\n=== private pages require auth ===")
for p in ["/account", "/admin"]:
    st, _, loc = anon.go(p, follow=False)
    ok(f"{p} redirects anonymous users", st in (302, 307) and "/login" in loc, f"{st} -> {loc}")
st, _, _ = anon.go("/wishlist")
ok("/wishlist handles anonymous", st in (200, 302, 307))

print("\n=== APIs reject bad input instead of 500ing ===")
for path, payload, expect in [
    ("/api/auth/login", {"email": "nobody@example.com", "password": "x"}, 401),
    ("/api/auth/signup", {"email": "bad", "password": "short"}, 400),
    ("/api/foot-scan", {}, 400),
    ("/api/foot-scan", {"measuredLengthMm": 9999, "source": "manual"}, 422),
    ("/api/community/question", {"title": "hi", "body": "short"}, 401),
    ("/api/brand-feedback", {"brand": "Nike", "rating": 5, "comment": "nice one here"}, 401),
    ("/api/track", {"type": "buy_click"}, 400),
    ("/api/wishlist", {}, 401),
    ("/api/feedback", {}, 400),
]:
    st, body, _ = anon.go(path, payload)
    ok(f"POST {path} -> {expect}", st == expect, f"got {st} {body[:80]}")

st, _, loc = anon.go("/api/go?url=javascript:alert(1)", follow=False)
ok("open-redirect blocked (javascript:)", st == 400, f"status {st}")
st, _, loc = anon.go("/api/go?url=//evil.example.com", follow=False)
ok("open-redirect blocked (protocol-relative)", st == 400, f"status {st}")

print("\n=== size conversion sanity ===")
ANCHORS = [(130, "kids", 5, 21.5), (160, "kids", 8.5, 26), (200, "kids", 13.5, 32),
           (230, "women", 4, 37), (240, "women", 5.5, 38.5), (267, "men", 8.5, 42.5), (285, "men", 10.5, 45.5)]
for mm, aud, uk, eu in ANCHORS:
    st, body, _ = anon.go("/api/foot-scan", {"measuredLengthMm": mm, "source": "manual", "audience": aud})
    if st != 200:
        ok(f"{mm}mm {aud}", False, f"status {st}")
        continue
    d = json.loads(body)
    s = d["sizes"]
    ok(f"{mm}mm {aud} -> UK {uk} / EU {eu}",
       abs(s["uk"] - uk) < 0.75 and abs(s["eu"] - eu) < 1.25,
       f"got UK {s['uk']} EU {s['eu']}")
    ok(f"{mm}mm {aud} uses the right scale",
       s["childScale"] == (aud == "kids" or mm < 205), f"childScale={s['childScale']}")

print("\n=== size chart page reflects the entered foot ===")
st, body, _ = anon.page("/size-chart?mm=267&audience=men")
ok("size-chart accepts mm", st == 200 and "267 mm" in body, f"status {st}")
ok("size-chart lists brands", "Nike" in body and "Bata" in body)
st, body, _ = anon.page("/size-chart?mm=9999")
ok("size-chart ignores implausible mm", st == 200 and "9999 mm foot" not in body, f"status {st}")

# ---------------------------------------------------------------- journeys
print("\n=== journey: shopper signs up, searches, measures, saves ===")
shopper = Client()
email = f"sanity{tag}@example.com"
st, body, _ = shopper.go("/api/auth/signup", {
    "email": email, "password": "SanityPass123", "name": "Sanity Shopper",
    "persona": "senior", "city": "Indore", "state": "Madhya Pradesh", "accountType": "user"})
ok("signup", st == 200, f"{st} {body[:100]}")
ok("session cookie set", "upanah_session" in shopper.cookies)

st, body, _ = shopper.page("/account")
ok("account page loads", st == 200, f"status {st}")
ok("account greets the user", "Sanity Shopper" in body)

st, body, _ = shopper.go("/api/foot-scan", {"measuredLengthMm": 267, "source": "manual", "audience": "men"})
res = json.loads(body) if st == 200 else {}
ok("measure via manual entry", st == 200 and res.get("sizeIsReliable") is True, f"{st}")

# Health data is gated on recorded consent — prove the gate, then consent.
st, body, _ = shopper.go("/api/foot-scan/save", res)
ok("saving measurements blocked without consent", st == 403 and "needsConsent" in body, f"{st} {body[:90]}")
st, body, _ = shopper.go("/api/health-consent", {"health": True})
ok("health consent recorded", st == 200 and json.loads(body).get("health") is True, f"{st} {body[:90]}")
st, body, _ = shopper.go("/api/health-consent")
cons = json.loads(body) if st == 200 else {}
ok("consent stores the notice version", bool(cons.get("version")) and cons.get("version") == cons.get("currentVersion"), body[:120])
ok("research consent is opt-in, not default", cons.get("research") is False, body[:90])
ok("diabetes declaration is off by default", cons.get("diabetes") is False, body[:90])

st, body, _ = shopper.go("/api/foot-scan/save", res)
ok("save foot profile", st == 200, f"{st} {body[:100]}")
st, body, _ = shopper.page("/account")
ok("saved size shows on account", "UK 8.5" in body, "size not rendered")
st, body, _ = shopper.page("/size-chart")
ok("size-chart picks up saved measurement", "267 mm" in body, "did not use profile")

if prods:
    pid = prods[0]["id"]
    st, body, _ = shopper.go("/api/wishlist", {"productId": pid})
    ok("add to wishlist", st == 200, f"{st} {body[:80]}")
    st, body, _ = shopper.page("/wishlist")
    ok("wishlist shows the item", st == 200 and prods[0]["name"][:18] in body, f"status {st}")
    st, body, _ = shopper.go("/api/feedback",
        {"productId": pid, "rating": 4, "fitFeedback": "true-to-size",
         "comment": "Sanity check review, fits well."})
    ok("product review posts", st == 200, f"{st} {body[:80]}")

st, body, _ = shopper.go("/api/brand-feedback", {
    "brand": prods[0]["brand"] if prods else "Nike", "rating": 4, "quality": 4, "comfort": 4,
    "durability": 4, "valueScore": 4, "sizingAccuracy": "small",
    "comment": "Sanity check: runs a touch small for me."})
ok("brand review posts", st == 200, f"{st} {body[:80]}")

print("\n=== journey: question and brand answer, publicly visible ===")
st, body, _ = shopper.go("/api/community/question", {
    "kind": "find", "title": f"Sanity: where to buy this in Indore ({tag})?",
    "body": "Looking for UK 8.5 in this model, budget about 4000 rupees.",
    "category": "running", "city": "Indore", "budget": 4000})
qid = json.loads(body).get("id") if st == 200 else None
ok("question posts", st == 200 and qid, f"{st} {body[:100]}")

brand = Client()
st, body, _ = brand.go("/api/auth/signup", {
    "email": f"sanitybrand{tag}@example.com", "password": "SanityPass123",
    "name": "Brand Rep", "accountType": "brand", "brandName": "Campus",
    "city": "Delhi", "state": "Delhi"})
ok("brand signup", st == 200, f"{st} {body[:80]}")
if qid:
    st, body, _ = brand.go("/api/community/answer",
                           {"questionId": qid, "body": "Campus official: in stock on our site and Ajio."})
    ok("brand answers", st == 200, f"{st} {body[:80]}")
    st, body, _ = anon.page(f"/community/{qid}")
    ok("thread public", st == 200, f"status {st}")
    ok("answer visible to anonymous", "Ajio" in body)
    ok("brand badge shown", "Campus official" in body)
    ok("QAPage schema", '"@type":"QAPage"' in body.replace(" ", ""))

print("\n=== journey: change password ===")
st, body, _ = shopper.go("/api/auth/change-password",
                         {"currentPassword": "WrongOne123", "newPassword": "NewSanity456"})
ok("wrong current password rejected", st == 403, f"{st}")
st, body, _ = shopper.go("/api/auth/change-password",
                         {"currentPassword": "SanityPass123", "newPassword": "NewSanity456"})
ok("password changed", st == 200, f"{st} {body[:80]}")
st, _, _ = Client().go("/api/auth/login", {"email": email, "password": "NewSanity456"})
ok("new password works", st == 200, f"{st}")
st, _, _ = Client().go("/api/auth/login", {"email": email, "password": "SanityPass123"})
ok("old password dead", st == 401, f"{st}")

# Contribution standing: visible to the contributor, and to readers weighing advice.
st, body, _ = shopper.page("/account")
ok("account shows a contribution standing", "Your standing" in body)
ok("standing suggests one concrete next step", "Measure your feet" in body or "Rate a brand" in body
   or "Answer someone" in body or "Review another brand" in body)
ok("nothing rewards merely logging in", "streak" not in body.lower())

print("\n=== privilege boundaries ===")
st, _, loc = shopper.go("/admin", follow=False)
ok("shopper cannot open /admin", "/admin" != urllib.parse.urlparse(loc).path, f"{st} -> {loc}")
esc = Client()
st, body, _ = esc.go("/api/auth/signup", {"email": f"esc{tag}@example.com",
                     "password": "SanityPass123", "name": "Esc", "accountType": "admin", "role": "admin"})
ok("cannot self-assign admin", '"role":"user"' in body.replace(" ", ""), body[:80])
if qid:
    st, _, _ = anon.go("/api/community/answer", {"questionId": qid, "body": "anonymous attempt"})
    ok("anonymous cannot answer", st == 401, f"{st}")

if ADMIN_PW:
    print("\n=== admin dashboard ===")
    admin = Client()
    st, body, _ = admin.go("/api/auth/login",
                           {"email": "prashant.malviya@upanah.com", "password": ADMIN_PW})
    ok("admin login", st == 200 and '"role":"admin"' in body.replace(" ", ""), f"{st} {body[:80]}")
    st, body, loc = admin.go("/admin", follow=False)
    ok("admin opens dashboard", st == 200, f"{st} -> {loc}")
    for section in ["Reach", "What people are looking for", "Where users register from",
                    "Brand scorecard", "Purchase intent", "Community", "Health outcomes",
                    "Anonymised foot anthropometry"]:
        ok(f"dashboard: {section}", section in body)
    # The outcome numbers must never be quoted without their caveats.
    ok("outcomes state what the evidence is worth", "no control group" in body)
    ok("outcomes suppress rates while the sample is tiny",
       "Not enough answers to quote a rate yet" in body or "reported less pain" in body)

    for w in [7, 30, 90, 365]:
        st, _, _ = admin.go(f"/admin?days={w}")
        ok(f"dashboard window {w}d", st == 200, f"{st}")

print("\n=== foot scan: is it followable ===")
st, body, _ = anon.page("/foot-scan")
ok("scan page loads", st == 200, f"{st}")
ok("lands on typing the number, not the six-marker flow",
   "How to get the number" in body and "Set it up like this" not in body)
ok("says plainly which route is most accurate", "easiest, and the most accurate" in body)
ok("accepts centimetres, which is what tape measures show", 'placeholder="26.7"' in body)
st, body, _ = anon.page("/foot-scan?mode=precise")
ok("photo route explains dragging rather than blind tapping", "drag six markers" in body)
ok("photo route promises a live reading", "updates as you move them" in body)
ok("photo route shows a setup diagram", "Set it up like this" in body)
ok("bad ?mode= falls back to the safe default",
   "How to get the number" in anon.page("/foot-scan?mode=nonsense")[1])

print("\n=== demand board & quiz ===")
# This suite must not appear in the analytics it is testing.
before = anon.page("/trends")[1]
for _ in range(3):
    anon.go("/api/search", {"q": "sanity probe shoes", "gender": "men"})
after = anon.page("/trends")[1]
ok("our own sweep is excluded from the demand data",
   ("sanity probe" not in after) and
   (("Not enough people yet" in before) == ("Not enough people yet" in after)),
   "sweep traffic reached the board")
st, body, _ = anon.page("/trends")
ok("trends page loads", st == 200, f"status {st}")
ok("trends refuses to imply sales data",
   "Nobody publishes footwear sales figures for India" in body or "not a sales chart" in body.lower(),
   body[:120])
ok("trends explains the people floor", "different people are behind it" in body)
ok("quiz is present with a sourced answer", "Source —" in body or "source" in body.lower())
# The board must never publish a row backed by fewer people than the floor.
import re as _re2
counts = [int(n) for n in _re2.findall(r">(\d+) (?:person|people)<", body)]
ok("no published row is below the people floor",
   all(c >= 2 for c in counts), f"counts={counts[:10]}")
ok("home page carries the board or the quiz",
   any(t in anon.page("/")[1] for t in ["What India is actually asking for",
                                        "Most people get shoe sizing wrong"]))

# Brand-authored best sellers: the attribution is the feature, so assert it.
st, body, _ = anon.page("/trends")
ok("brand best-seller lists are attributed to the brand's own collection",
   "Best Sellers" in body and "read" in body, "")
ok("prices are not passed off as live", "will have moved since" in body)
ok("no brand product photographs are republished", "no product photographs" in body)

print("\n=== brand directory ===")
st, body, _ = anon.page("/brands")
ok("brand directory loads", st == 200, f"status {st}")
import re as _re
slugs = sorted(set(_re.findall(r"/api/brand-visit\?b=([a-z0-9-]+)", body)))
ok("directory lists many brands", len(slugs) >= 25, f"{len(slugs)} found")
ok("directory states its neutrality", "don't take payment for a listing" in body)
ok("directory shows a plain store address to fall back on", ".com" in body or ".in" in body)
# Outbound links must not be declared paid placements — the page claims neutrality.
ok("outbound links are not marked sponsored", "sponsored" not in body)

for f_ in ["category=leather", "category=comfort", "category=school", "audience=kids",
           "price=value", "origin=Indian", "category=running&price=value"]:
    st, b2, _ = anon.page(f"/brands?{f_}")
    n = len(set(_re.findall(r"/api/brand-visit\?b=([a-z0-9-]+)", b2)))
    ok(f"filter {f_} returns brands", st == 200 and n > 0, f"{st}, {n} brands")

# every brand's detail page must exist and every lead redirect must resolve
bad_pages, bad_redirects = [], []
for slug in slugs:
    st, _, _ = anon.go(f"/brands/{slug}")
    if st != 200:
        bad_pages.append(f"{slug}:{st}")
    st, _, loc = anon.go(f"/api/brand-visit?b={slug}", follow=False)
    if st not in (302, 307) or not loc.startswith("http"):
        bad_redirects.append(f"{slug}:{st}")
ok(f"all {len(slugs)} brand pages load", not bad_pages, ", ".join(bad_pages[:5]))
ok(f"all {len(slugs)} lead redirects resolve", not bad_redirects, ", ".join(bad_redirects[:5]))

st, _, _ = anon.go("/api/brand-visit?b=not-a-real-brand", follow=False)
ok("unknown brand redirect rejected", st == 404, f"{st}")
st, _, _ = anon.go("/brands/not-a-real-brand")
ok("unknown brand page 404s", st == 404, f"{st}")

st, body, _ = anon.page("/sitemap.xml")
ok("sitemap includes brand pages", body.count("/brands/") >= 25, f"{body.count('/brands/')} entries")

print("\n=== remaining endpoints and edge pages ===")
st, body, _ = shopper.go("/api/health", {"steps": 4200, "distanceKm": 3.1, "activity": "walk", "painArea": "heel"})
ok("health log posts", st in (200, 201), f"{st} {body[:80]}")

st, body, _ = shopper.go("/api/health")
hd = json.loads(body) if st == 200 else {}
scr = hd.get("screening") or {}
ok("screening produced", st == 200 and bool(scr), f"{st}")
ok("screening not urgent for ordinary pain", scr.get("urgent") is False, str(scr.get("urgent")))
ok("screening offers footwear needs", bool(scr.get("needs")), str(scr.get("needs")))

# A red flag must suppress product advice and route to a clinician.
shopper.go("/api/health", {"steps": 1000, "distanceKm": 0.5, "activity": "walk", "numbness": True})
st, body, _ = shopper.go("/api/health")
scr = (json.loads(body) if st == 200 else {}).get("screening") or {}
ok("red flag makes the screening urgent", scr.get("urgent") is True, str(scr.get("urgent")))
ok("red flag carries a clinician action", "doctor" in json.dumps(scr.get("redFlags", [])).lower())

# Declaring diabetes must lower the referral threshold, because reduced sensation
# means a bad fit does its damage unfelt. Pain that is otherwise a footwear note
# becomes a reason to see someone.
st, body, _ = shopper.go("/api/health-consent", {"diabetes": True})
ok("diabetes can be declared", st == 200 and json.loads(body).get("diabetes") is True, body[:90])
for _ in range(4):
    shopper.go("/api/health", {"steps": 5000, "distanceKm": 3, "activity": "walk", "painArea": "heel"})
st, body, _ = shopper.go("/api/health")
scr = (json.loads(body) if st == 200 else {}).get("screening") or {}
ok("persistent pain refers when diabetes is declared", scr.get("urgent") is True, str(scr.get("urgent")))
ok("referral asks for a foot examination",
   "foot examination" in json.dumps(scr.get("redFlags", [])).lower(),
   json.dumps(scr.get("redFlags", []))[:160])
shopper.go("/api/health-consent", {"diabetes": False})

# The outcome loop. Guidance for logged pain opens a four-week follow-up; the
# follow-up is the only thing this product records that says whether it helped.
st, body, _ = shopper.go("/api/health/follow-up")
ok("no follow-up offered on day one", json.loads(body).get("episode") is None, body[:100])
st, body, _ = shopper.go("/api/health/follow-up", {"episodeId": "not-mine",
                                                   "painChange": "better", "changedFootwear": "yes"})
ok("cannot answer someone else's follow-up", st == 404, f"{st}")

# Withdrawal must erase, not merely hide.
st, body, _ = shopper.go("/api/health-consent", {"health": False})
ok("withdrawal reports deletion", st == 200 and json.loads(body).get("deleted") is True, body[:100])
st, body, _ = shopper.go("/api/health")
hd = json.loads(body) if st == 200 else {}
ok("withdrawal removed the logs", hd.get("logs") == [], str(hd.get("logs"))[:60])
ok("withdrawal removed the foot profile", hd.get("hasFootProfile") is False)
st, body, _ = shopper.go("/api/health/follow-up")
ok("withdrawal removed the care episodes", json.loads(body).get("episode") is None, body[:80])
st, body, _ = shopper.go("/api/health-consent")
ok("withdrawal cleared the diabetes declaration", json.loads(body).get("diabetes") is False, body[:90])
st, _, _ = shopper.go("/api/health", {"steps": 1, "distanceKm": 1, "activity": "walk"})
ok("logging blocked again after withdrawal", st == 403, f"{st}")

st, body, _ = anon.page("/foot-health")
ok("public foot-health page loads", st == 200, f"{st}")
for needle in ["not a medical device", "Not clinically validated",
               "did you change your footwear", "±3 mm", "8.5 mm"]:
    ok(f"foot-health page states: {needle}", needle in body)

st, body, _ = anon.page("/data-and-privacy")
ok("privacy notice page loads", st == 200, f"{st}")
for needle in ["not a medical device", "Withdrawal deletes", "Digital Personal Data Protection Act"]:
    ok(f"privacy notice states: {needle}", needle in body)
if prods:
    st, body, _ = shopper.go("/api/try-on", {"productId": prods[0]["id"], "personImageDataUrl": "data:image/jpeg;base64,/9j/4AAQ", "outfit": "Casual"})
    ok("try-on responds without 500", st != 500 and st != 0, f"{st} {body[:80]}")
st, _, _ = shopper.go("/api/auth/logout", {})
ok("logout", st == 200, f"{st}")
st, _, loc = shopper.go("/account", follow=False)
ok("logout really ended the session", st in (302, 307) and "/login" in loc, f"{st} -> {loc}")
st, body, _ = anon.go("/this-page-does-not-exist")
ok("unknown page 404s", st == 404, f"{st}")

print("\n=== erasure, and cleaning up after ourselves ===")
# The privacy notice claims a right to erasure. Prove it works, prove it cannot be
# triggered by accident, and use it to remove the accounts this run created — a
# sweep that leaves debris behind in a live database is not a sweep anyone will
# want to run against production.
# The shopper was logged out by the session test above, and its password was
# changed by the change-password test. Sign back in with the current one.
st, _, _ = shopper.go("/api/auth/login", {"email": email, "password": "NewSanity456"})
ok("shopper can sign back in to delete itself", st == 200, f"{st}")

for label, client in [("shopper", shopper), ("brand", brand), ("escalation", esc)]:
    if client is None:
        continue
    st, body, _ = client.go("/api/account/delete", {})
    ok(f"{label}: deletion refuses without the confirmation", st == 400, f"{st} {body[:70]}")
    st, body, _ = client.go("/api/account/delete", {"confirm": "DELETE"})
    ok(f"{label}: account deleted", st == 200, f"{st} {body[:70]}")
    st, _, loc = client.go("/account", follow=False)
    ok(f"{label}: session is gone with it", st in (302, 307), f"{st} -> {loc}")

st, body, _ = anon.go("/api/account/delete", {"confirm": "DELETE"})
ok("anonymous cannot delete an account", st == 401, f"{st}")

print("\n" + "=" * 66)
print(f"{checks} checks, {len(problems)} problems")
for label, detail in problems:
    print(f"  - {label}" + (f"  [{detail[:140]}]" if detail else ""))
sys.exit(1 if problems else 0)
