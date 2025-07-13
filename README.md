# NextBlog Social

เว็บไซต์โซเชียลบล็อกที่ใช้ NextJS พร้อม Discord Authentication และระบบเพื่อน

## ฟีเจอร์หลัก

- 🔐 **Discord Authentication** - เข้าสู่ระบบด้วย Discord
- 👥 **ระบบเพื่อน** - ส่งคำขอเป็นเพื่อน ยอมรับ/ปฏิเสธ
- 📝 **โพสต์และคอมเมนต์** - สร้าง แก้ไข ลบโพสต์และคอมเมนต์
- 🔍 **ค้นหา** - ค้นหาผู้ใช้และโพสต์
- 📊 **ฟีดแบบ Priority** - โพสต์ของเพื่อนจะแสดงก่อน
- 👑 **Admin Panel** - จัดการผู้ใช้ แก้ไข/ลบโพสต์
- ⚡ **Real-time Updates** - อัปเดตแบบ real-time

## การติดตั้ง

### 1. Clone Repository

```bash
git clone <repository-url>
cd nextblog-social
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local`:

#### Discord OAuth Setup
1. ไปที่ https://discord.com/developers/applications
2. สร้าง New Application
3. ไปที่ OAuth2 > General
4. เพิ่ม Redirect URL: `http://localhost:3000/api/auth/callback/discord`
5. คัดลอก Client ID และ Client Secret

#### MongoDB Setup
- **Local MongoDB**: `mongodb://localhost:27017/nextblog-social`
- **MongoDB Atlas**: ใช้ connection string จาก Atlas

#### Admin Setup
1. เข้า Discord > User Settings > Advanced > Developer Mode (เปิด)
2. คลิกขวาที่โปรไฟล์ของคุณ > Copy User ID
3. ใส่ Discord ID ในตัวแปร `ADMIN_DISCORD_IDS`

### 4. รันโปรเจค

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## การใช้งาน

### สำหรับผู้ใช้ทั่วไป
1. เข้าสู่ระบบด้วย Discord
2. สร้างโพสต์ใหม่
3. ค้นหาและเพิ่มเพื่อน
4. คอมเมนต์ในโพสต์
5. ดูฟีดหลักที่โพสต์เพื่อนจะแสดงก่อน

### สำหรับ Admin
1. เข้าสู่ระบบด้วย Discord ID ที่ตั้งเป็น Admin
2. ไปที่ Admin Panel
3. จัดการผู้ใช้:
   - เปลี่ยน username
   - Ban/Unban ผู้ใช้
   - ลบบัญชีผู้ใช้
4. แก้ไข/ลบโพสต์ของผู้ใช้ทุกคน

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── admin/              # Admin panel
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── create-post/       # สร้างโพสต์
│   ├── friends/           # จัดการเพื่อน
│   └── search/            # ค้นหา
├── components/            # React components
├── lib/                   # Utilities
└── models/               # Database models
```

## API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Posts
- `GET /api/posts` - ดึงโพสต์ทั้งหมด
- `POST /api/posts` - สร้างโพสต์ใหม่
- `PUT /api/posts/[id]` - แก้ไขโพสต์
- `DELETE /api/posts/[id]` - ลบโพสต์

### Friends
- `GET /api/friends` - ดึงรายชื่อเพื่อน
- `POST /api/friends` - ส่งคำขอเป็นเพื่อน
- `GET /api/friends/requests` - ดึงคำขอเป็นเพื่อน
- `PUT /api/friends/requests/[id]` - ยอมรับ/ปฏิเสธคำขอ

### Comments
- `POST /api/comments` - สร้างคอมเมนต์
- `PUT /api/comments/[id]` - แก้ไขคอมเมนต์
- `DELETE /api/comments/[id]` - ลบคอมเมนต์

### Search
- `GET /api/search` - ค้นหาผู้ใช้และโพสต์

### Admin
- `GET /api/admin/users` - ดึงรายชื่อผู้ใช้ (Admin เท่านั้น)
- `PUT /api/admin/users/[id]` - แก้ไขผู้ใช้ (Admin เท่านั้น)
- `DELETE /api/admin/users/[id]` - ลบผู้ใช้ (Admin เท่านั้น)

## Database Models

- **User** - ข้อมูลผู้ใช้และเพื่อน
- **Post** - โพสต์และประวัติการแก้ไข
- **Comment** - คอมเมนต์และการตอบกลับ
- **FriendRequest** - คำขอเป็นเพื่อน
- **AdminAction** - บันทึกการกระทำของ Admin

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Authentication**: NextAuth.js with Discord Provider
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO (coming soon)

## การพัฒนาต่อ

- [ ] อัปโหลดรูปภาพ
- [ ] Real-time notifications
- [ ] Like/Unlike posts
- [ ] Reply to comments
- [ ] User profiles
- [ ] Dark mode

## License

MIT License
