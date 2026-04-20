# GeoVardiyaApp

Coğrafi konum destekli vardiya yönetim uygulaması. Next.js PWA, MongoDB, Leaflet ve Web Push teknolojileri ile geliştirilmiştir.

## Özellikler

- **İşveren:** Leaflet harita üzerinde işyeri alanı tanımlama (50–1000m yarıçap), adres/yer arama, mevcut konum butonu, işçi ekleme/çıkarma, 5 dakikalık konum log takibi
- **İşçi:** Otomatik konum kontrolü (5 dk), arka plan servis worker, alan içi/dışı push bildirimleri
- **PWA:** Ana ekrana kurulabilir, çevrimdışı destek, mobil bildirimler

## Kurulum

### Gereksinimler

- Node.js 20+
- MongoDB (yerel veya Atlas)

### Adımlar

```bash
git clone https://github.com/tahayunusdemir/geovardiyaapp.git
cd geovardiyaapp
npm install
```

`.env.local` dosyası oluştur:

```
MONGODB_URI=mongodb://localhost:27017/geovardiya
NEXTAUTH_SECRET=gizli_bir_string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

VAPID anahtarlarını üretmek için:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### MongoDB'yi Başlat (WSL / Linux)

```bash
sudo systemctl start mongod
# veya systemd yoksa:
sudo mongod --dbpath /var/lib/mongodb --fork --logpath /var/log/mongodb/mongod.log
```

### Geliştirme Sunucusu

```bash
npx next dev
```

`http://localhost:3000` adresini aç.

---

## İşveren Hesabı Oluşturma (Manuel)

Kayıt ekranı yalnızca işçi kaydı içindir. İşveren hesabını aşağıdaki yöntemlerden biriyle oluştur:

### Yöntem 1 — mongosh ile

```bash
mongosh geovardiya
```

```js
db.users.insertOne({
  name: "Ad",
  surname: "Soyad",
  email: "isveren@sirket.com",
  password: "$2a$12$HASH",   // bcrypt hash — aşağıya bak
  role: "employer",
  createdAt: new Date()
})
```

Bcrypt hash üretmek için Node.js terminalinde:

```bash
node -e "const b=require('bcryptjs'); b.hash('şifren', 12).then(console.log)"
```

Çıkan hash'i `password` alanına yapıştır.

### Yöntem 2 — Seed Script ile

Proje kökünde `scripts/seed.ts` oluştur ve çalıştır:

```bash
npx tsx scripts/seed.ts
```

---

## Proje Yapısı

```
app/
├── page.tsx                        # Giriş / Kayıt ekranı
├── actions.ts                      # Push bildirim server actions
├── providers.tsx                   # NextAuth SessionProvider
├── api/
│   ├── auth/[...nextauth]/         # NextAuth endpoint
│   ├── register/                   # İşçi kayıt API
│   ├── workplace/                  # İşyeri CRUD + işçi yönetimi
│   ├── employees/                  # İşçi arama
│   └── location/
│       ├── check/                  # Konum kontrol + haversine + push
│       └── logs/                   # Konum geçmişi
├── dashboard/
│   ├── employer/                   # İşveren paneli (Leaflet harita)
│   └── employee/                   # İşçi paneli (konum durumu)
lib/
├── db.ts                           # MongoDB bağlantısı
├── auth.ts                         # NextAuth config
├── haversine.ts                    # Mesafe hesabı (metre)
└── models/
    ├── User.ts
    ├── Workplace.ts
    ├── LocationLog.ts
    └── PushSubscription.ts
proxy.ts                            # Rota koruması (rol bazlı)
public/
└── sw.js                           # Service Worker
```

## Teknolojiler

| | |
|---|---|
| Framework | Next.js 16 (App Router, PWA) |
| Veritabanı | MongoDB + Mongoose |
| Auth | NextAuth.js (JWT) |
| Harita | Leaflet + React Leaflet |
| Push | Web Push (VAPID) |
| Deploy | Vercel + MongoDB Atlas |

## Deploy (Vercel)

1. Repoyu Vercel'e bağla: [vercel.com/new](https://vercel.com/new)
2. Environment variables ekle (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, VAPID keys)
3. Production için `MONGODB_URI`'yi MongoDB Atlas bağlantısıyla güncelle
