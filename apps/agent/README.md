# RAVISN multi-channel agent — Phase 1 → 6

**Phase 1** — database, backend, knowledge-base-restricted AI agent core.
**Phase 2** — real login/signup, dashboard shell, functional knowledge base panel.
**Phase 3** — WhatsApp official Cloud API: connect, live webhook, auto-reply, real inbox.
**Phase 3b** — WhatsApp QR connect (Baileys), running as its own Node service.
**Phase 4** — Facebook Messenger + Instagram DMs: connect, live webhook, auto-reply.
**Phase 5** — Bookings tab: channel-separated view of every captured booking.
**Phase 6** — production polish: migrations, security defaults, health checks, Docker.

## Ek bug jo maine pakड़ा aur theek kiya

`python-dotenv` Phase 1 se `requirements.txt` mein tha lekin kahin actually load nahi
ho raha tha — matlab `.env` file kabhi khud se load hi nahi hoti thi, sirf real shell
environment variables kaam karte. Meri testing hamesha env vars ki absence pe depend
karti thi (mock mode trigger karne ke liye), is liye ye pakड़ में नहीं आया. Ab
`app/main.py`, `alembic/env.py`, aur `smoke_test.py` teenon `.env` ko sabse pehle
load karte hain. Agar aap ne pehle `.env` file bana kar values daali thi aur wo kaam
nahi kar rahi thi, ab honi chahiye.

## Phase 6 mein kya add hua

- **Migrations (Alembic)** — pehle sirf `create_all()` tha (dev ke liye theek, lekin
  production mein schema change karne ka koi safe tareeqa nahi tha). Ab sqlite (local
  dev) abhi bhi khud table bana leta hai, lekin postgres/production ke liye
  `alembic upgrade head` chalana zaroori hai
- **CORS** — `.env` mein `CORS_ORIGINS` se control hota hai, production mein apne
  frontend domain tak restrict kar dein (`*` sirf local dev ke liye)
- **`GET /health`** — database connectivity check ke sath, deployment monitoring
  (Docker healthcheck, load balancer) ke liye
- **Frontend error boundary** — koi bhi unexpected crash ab blank safed screen ki
  jagah ek "reload karein" message dikhata hai
- **Docker** — poora stack (postgres, backend, whatsapp-qr-service, frontend) ek
  `docker-compose up` se chal sakta hai

**Honest disclosure:** is sandbox ki network sirf specific domains tak access deti hai
(pypi, npm, github waghera) — Docker Hub (jahan se `python:3.12-slim`, `node:20-slim`,
`postgres:16-alpine`, `nginx:alpine` images aati hain) allowed list mein nahi hai. Is
liye Dockerfiles aur docker-compose.yml maine dhyan se, well-established patterns se
likhi hain, YAML syntax verify ki hai — lekin `docker-compose up` khud chala kar
verify nahi kar saka. Pehli baar chalate waqt zaraa dhyan se dekhein, agar koi issue
aaye to batayein.

## Deploy karne ke liye (Docker se)

```bash
cp .env.example .env              # values fill karein
cp whatsapp-qr-service/.env.example whatsapp-qr-service/.env
docker compose up --build
```

Backend `:8000`, QR service `:3001`, frontend `:5173` pe (nginx se serve hoti hai,
production mein apne domain/reverse-proxy ke peeche laga dein).

## Pehli baar real deploy karne se pehle (checklist)

- [ ] `JWT_SECRET` ko ek lambi random string se replace karein
- [ ] `WHATSAPP_QR_INTERNAL_SECRET` dono `.env` files mein same, aur default se badal dein
- [ ] `CORS_ORIGINS` ko apne frontend domain tak restrict karein
- [ ] `POSTGRES_PASSWORD` set karein (docker-compose ke liye)
- [ ] `OPENAI_API_KEY` daalein (warna replies mock rahenge)
- [ ] WhatsApp/Facebook/Instagram live karne ke liye `META_APP_SECRET` set karein
- [ ] Webhook URLs (Meta dashboard mein) apne real public domain se point karein

## Facebook + Instagram abhi kaise kaam karte hain

Dono ek hi Meta Graph API se hote hain, is liye ek hi webhook (`/webhooks/meta`) dono
ko handle karta hai — Meta jo payload bhejta hai usme `object` field batata hai ke
ye Facebook Page ka message hai (`"page"`) ya Instagram DM (`"instagram"`), aur us
hisab se sahi tenant + channel dhoond liya jata hai.

Jaisa WhatsApp official mein tha, waisa hi yahan bhi: poora one-click "Login with
Facebook" flow RAVISN ke Meta app ke App Review pass karne ke baad aayega. Tab tak
Connect page pe manual form hai — apne Meta app dashboard se Page id / access token
(Facebook) ya Instagram business account id / access token (Instagram) paste kar dein.
Jab tak App Review nahi hua, ye sirf un pages/accounts pe kaam karega jahan aap khud
us Meta app pe admin ya tester ki tarah add hain.

**Ek choti si simplification abhi ke liye:** customer ka naam webhook mein nahi aata
(WhatsApp ke ulat, jahan ye seedha milta hai) — usko fetch karne ke liye ek extra
Graph API call chahiye hogi, jo abhi skip ki hai. Conversation list mein filhal
sirf unka ID dikhega naam ki jagah, jab tak ye add na karein.

## WhatsApp QR service (`whatsapp-qr-service/`)

Ye ek alag Node.js service hai kyunki Baileys (WhatsApp Web protocol library)
JavaScript mein hai, Python mein nahi. Python backend isse HTTP se baat karta hai —
dashboard kabhi is service ko directly nahi chhoti, sirf Python ke through.

- Aap "Connect via qr code" click karte hain → Python service ko `/sessions/{tenant}/start`
  pe bolta hai → wo ek QR code deta hai → aap WhatsApp mein "Linked devices" se scan
  karte hain → connect ho jata hai
- Connect hone ke baad har incoming message Node service se Python ke
  `/webhooks/whatsapp-qr` pe forward hoti hai — wahi Phase 1 wala agent pipeline
  chalta hai, reply wapis Node service ke through jati hai
- Dono services ke beech ek shared secret hai (`WHATSAPP_QR_INTERNAL_SECRET`, dono
  `.env` files mein same hona chahiye) taake koi aur is internal route ko call na
  kar sake

**Mock mode by default (`WHATSAPP_QR_MOCK=true`).** Real WhatsApp se connect karne
ke liye ek phone chahiye jo QR scan kare — automated environment mein ye possible
nahi, is liye maine khud bhi is poori chain ko live test kiya (dono services chala
ke, real HTTP calls ke sath) lekin **mock mode mein** — ek fake QR banta hai, 8
second baad "connected" ho jata hai jaise scan ho gaya ho, aur ek
`/sessions/:tenantId/simulate-incoming` endpoint hai jisse aap khud ek customer ka
message simulate kar sakte hain bina real phone ke. Jab real number se test karna
ho, `whatsapp-qr-service/.env` mein `WHATSAPP_QR_MOCK=false` kar dein — us case mein
session credentials `sessions/` folder mein save hote hain (ye folder `.gitignore`
mein hai, kabhi commit na karein, isme kisi ka WhatsApp session hota hai).

### Chalane ke liye (teesri terminal)

```bash
cd whatsapp-qr-service
npm install
cp .env.example .env
npm start
```

Backend aur frontend already chal rahe hon (README mein upar), phir dashboard ke
Connect page pe "Connect via qr code" try karein.

## WhatsApp official connect abhi kaise kaam karta hai

Poora one-click setup (Meta ka Embedded Signup) ke liye RAVISN ko pehle approved
**Meta Tech Provider** banna hoga — ye Meta ke sath ek baar ki business registration
hai (business verification), aur by default aap ek rolling week mein 10 naye clients
onboard kar sakte hain jab tak App Review bhi complete na ho, uske baad 200/week ho
jata hai. Jab tak wo nahi hota, Connect page pe ek manual form hai: apne Meta app
dashboard ki WhatsApp → API setup page se phone_number_id + access_token paste kar
dein. Ye bilkul wahi test number/token hai jo aap pehle Make.com wale build mein
webhook-verification stage pe dekh rahe thay — wahi yahan bhi chalega.

Connect hone ke baad:

- `POST /webhooks/whatsapp` — Meta har incoming message yahan bhejta hai. Hum dekhte
  hain ke receiving phone_number_id kis tenant ka hai, message ko Phase 1 wale
  knowledge-base-restricted agent se guzarte hain, save karte hain, aur reply wapis
  `POST https://graph.facebook.com/.../messages` se bhejte hain.
- `GET /webhooks/whatsapp` — one-time verification handshake jo Meta webhook url
  set karte waqt karta hai.
- `META_APP_SECRET` set na ho to ye **mock mode** mein rehta hai: replies server
  console pe print hoti hain bhejne ki bajaye, aur webhook signature check skip ho
  jata hai. Baaki sab (routing, agent, inbox mein save) real hai.

**Live jaane ke liye public https url chahiye.** Meta `localhost` ko call nahi kar
sakta. Local testing ke liye `ngrok http 8000` jaisa kuch use karein, aur wo url
(plus `/webhooks/whatsapp`) Meta app dashboard mein webhook url ki jagah daal dein.

## Auth kaise kaam karta hai

Pehle sirf `api_key` tha (machine/script testing ke liye theek). Ab dashboard ke liye
real login chahiye tha, to add kiya:

- `POST /auth/signup` — business_name + slug + email + password → naya tenant aur
  uska pehla user ek sath create hote hain, JWT milti hai
- `POST /auth/login` — email + password → JWT
- `GET /auth/me` — current session confirm karta hai (frontend page-load pe ye call
  karta hai)

Knowledge-base jaise endpoints ab **dono** methods accept karte hain — dashboard se
JWT (`Authorization: Bearer <token>`) aata hai, scripts/tests se purana `X-API-Key`
bhi chalta rehta hai. Dono ek hi tenant ko resolve karte hain.

**Security note:** `.env` mein `JWT_SECRET` ek placeholder hai — production mein
deploy karne se pehle isko ek lambi random string se replace karna zaroori hai,
warna tokens forge kiye ja sakte hain. Password bcrypt se hash hoke store hoti hai,
plain text kabhi nahi.

## Multi-tenant design

`tenants` table core hai — har client business (RAVISN ka apna account bhi) is table mein
ek row hai. Har doosri table (`conversations`, `messages`, `knowledge_base`, `bookings`,
`channel_connections`) `tenant_id` se link hai, taake har client ka data isolated rahe.
Requests `X-API-Key` header se authenticate hoti hain — tenant create karte waqt ek unique
api_key milti hai.

`channel_connections` mein `connection_method` field hai (`qr` ya `official_api`) — WhatsApp
ke liye dono routes support karne ka structural decision yahin reflect hota hai. Phase 3 mein
isko actually implement karenge.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate          # windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

`.env` khali chhod dein for now — bina OPENAI_API_KEY ke agent "mock mode" mein chalta hai
(reply placeholder hoti hai, lekin poora flow — DB, booking capture, sab — test ho jata hai).
Jab real reply chahiye ho, apni OpenAI key `.env` mein daal dein.

## Run

```bash
uvicorn app.main:app --reload
```

Server `http://localhost:8000` pe chalega. Docs `http://localhost:8000/docs` pe (FastAPI
auto-generates ye Swagger UI, sab endpoints wahan test kar sakte hain).

Poora flow verify karne ke liye:

```bash
python3 smoke_test.py
```

## Frontend (dashboard) setup

Backend chalu hone ke baad, doosri terminal mein:

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL default localhost:8000 pe already set hai
npm run dev
```

`http://localhost:5173` khulega. Signup page se ek naya workspace banayein (business
name + email + password), aap automatically dashboard pe login ho jayenge, aur wahan
se knowledge base mein Q&A add/dekh sakte hain. Connect/Inbox/Bookings abhi placeholder
hain, click karke dekh sakte hain ke navigation kaisi lagegi.

Design: navy/indigo (`#1B1F3B`) rail RAVISN ke existing brand ke sath match karta hai,
Space Grotesk headings ke liye, Inter body text ke liye.

## Manual walkthrough (curl)

```bash
# 1. Naya workspace + owner account banayein (ye hi signup hai)
curl -X POST localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"business_name": "Bright Smile Clinic", "slug": "bright-smile", "email": "owner@brightsmile.com", "password": "a-strong-password"}'
# response mein "token" milega - agay yehi Bearer token use karni hai

# 2. Knowledge base mein Q&A add karein
curl -X POST localhost:8000/knowledge \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Clinic ke timings kya hain?", "answer": "Mon-Sat 10am-8pm"}'

# 3. Test message bhejein (abhi koi real channel connect nahi, seedha test)
curl -X POST localhost:8000/chat/test-message \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"channel": "whatsapp", "contact_external_id": "923001234567", "message": "timings kya hain?"}'
```

## Jo abhi prove hota hai

- Multiple tenants ek hi backend pe isolated rehte hain (galat api_key = 401)
- Har channel (whatsapp/instagram/facebook) ki conversation alag rehti hai, chahe backend
  ek hi ho
- Agent sirf knowledge_base se jawab deta hai — us se bahar ka sawal ho to fallback
- Booking-intent detect hone par `bookings` table mein channel ke saath save hota hai

## Status

Sab 6 planned phases done hain. Aage jo cheezein genuinely bachi hain agar chahiye ho:

- Real Meta Tech Provider / App Review (business process, code nahi)
- Facebook/Instagram sender ka naam fetch karna (ek extra Graph API call)
- Forgot-password flow (email-sending provider chahiye hoga - decision aapki)
- Conversations/bookings list pagination (abhi kaam kar raha hai, bas scale pe sochna hoga jab volume badhe)
