# ระบบรายรับ-รายจ่าย (Income-Outcome Tracker)

ระบบจัดการรายรับและรายจ่าย สำหรับธุรกิจขนาดเล็ก สร้างด้วย Next.js + Supabase

---

## สิ่งที่ต้องเตรียม

1. **Node.js** version 18 ขึ้นไป - ดาวน์โหลดที่ https://nodejs.org (เลือก LTS)
2. **Supabase Account** - สมัครฟรีที่ https://supabase.com (ใช้ GitHub Account สมัครง่ายสุด)
3. **โค้ดโปรเจค** - อยู่ในโฟลเดอร์ `incomeoutcome-app`

---

## ขั้นตอนที่ 1: สมัคร Supabase และสร้าง Project

### 1.1 สมัคร Supabase
1. เปิด browser ไปที่ **https://supabase.com**
2. กดปุ่ม **Start your project** (มุมบนขวา)
3. เลือก **Sign up with GitHub** (ง่ายสุด) หรือ Email
4. ถ้าสมัครด้วย Email ให้ไปยืนยันในอีเมลก่อน

### 1.2 สร้าง Project ใหม่
1. หลังเข้า Dashboard แล้ว กดปุ่ม **New project** (ปุ่มสีเขียว)
2. กรอกข้อมูล:
   - **Organization**: เลือก organization ที่มี หรือสร้างใหม่ (ตั้งชื่ออะไรก็ได้)
   - **Project name**: ใส่ `incomeoutcome`
   - **Database Password**: ใส่รหัสผ่านที่จำได้ **(เก็บไว้ให้ดี!)**
   - **Region**: เลือก **Southeast Asia (Singapore)**
3. กด **Create new project**
4. รอ 1-2 นาที จน project สร้างเสร็จ

---

## ขั้นตอนที่ 2: หา API Key สำหรับเชื่อมต่อ

### 2.1 หา Project URL
1. ใน Supabase Dashboard กดที่ **Project Settings** (ไอคอนเฟือง มุมล่างซ้าย)
2. กดที่ **General** ในเมนูซ้าย
3. หาหัวข้อ **Project URL** แล้วคัดลอกไว้
   - รูปแบบจะเป็น: `https://xxxxxxxx.supabase.co`

### 2.2 หา Publishable Key (ใช้แทน anon key เดิม)
1. ใน Supabase Dashboard กดที่ **Project Settings** (ไอคอนเฟือง มุมล่างซ้าย)
2. กดที่ **API Keys** ในเมนูซ้าย
3. จะเจอ 2 ประเภท key:
   - **Publishable key** (`sb_publishable_...`) = ใช้สำหรับแอปเรา **คัดลอกตัวนี้**
   - **Secret key** (`sb_secret_...`) = ไม่ต้องใช้ (เก็บไว้)
4. กดไอคอน **copy** ข้าง Publishable key คัดลอกไว้

---

## ขั้นตอนที่ 3: ตั้งค่าโค้ดในเครื่อง

### 3.1 เปิด PowerShell / Command Prompt
```
# ไปที่โฟลเดอร์โปรเจค
cd C:\incomeoutcome\incomeoutcome-app
```

### 3.2 ติดตั้ง Dependencies
```
npm install
```
รอจนเสร็จ (1-2 นาที)

### 3.3 ใส่ API Key ลงไฟล์ `.env.local`

เปิดไฟล์ `.env.local` ด้วย Notepad หรือ VS Code แล้วใส่ข้อมูล:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

**แทนที่ 2 ค่านี้:**
- `https://xxxxxxxx.supabase.co` = Project URL จากขั้นตอน 2.1
- `sb_publishable_xxxxxxxxxxxxxxxx` = Publishable Key จากขั้นตอน 2.2

บันทึกไฟล์

---

## ขั้นตอนที่ 4: สร้าง Database Tables

1. ใน Supabase Dashboard กดที่ **SQL Editor** (เมนูซ้าย)
2. กดปุ่ม **New query**
3. เปิดไฟล์ `supabase/schema.sql` ในโฟลเดอร์โปรเจค
4. คัดลอกโค้ดทั้งหมดไปวางใน SQL Editor
5. กดปุ่ม **Run** (หรือ Ctrl+Enter)
6. รอจนเห็นข้อความ **"Success. No rows returned"** = สำเร็จ

---

## ขั้นตอนที่ 5: สร้าง Storage Bucket (เก็บไฟล์)

### 5.1 สร้าง Bucket
1. ใน Supabase Dashboard กดที่ **Storage** (เมนูซ้าย)
2. กดปุ่ม **New bucket**
3. กรอก:
   - **Name**: `transaction-files`
   - **Public bucket**: ปิด (OFF) ไม่ต้องเปิด
4. กด **Create bucket**

### 5.2 สร้าง Policies (ความปลอดภัย)
1. เข้าไปใน bucket `transaction-files` ที่สร้าง
2. กดที่แท็บ **Policies**
3. กด **New policy** > เลือก **For full customization**
4. สร้าง Policy ทั้งหมด 4 ตัว ทำทีละตัว:

---

**Policy ที่ 1: ให้อ่านไฟล์ income ได้**

- กด **New policy**
- เลือก **For full customization**
- **Policy Name**: `Users can read own income files`
- **Allowed operations**: เลือก **SELECT**
- **Using expression** (ช่องล่าง):
```sql
bucket_id = 'transaction-files'
AND (storage.foldername(name))[1] = 'income'
AND EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = auth.uid()
  AND t.id::text = (storage.foldername(name))[4]
)
```
- กด **Save policy**

---

**Policy ที่ 2: ให้อ่านไฟล์ outcome ได้**

- กด **New policy** > **For full customization**
- **Policy Name**: `Users can read own outcome files`
- **Allowed operations**: เลือก **SELECT**
- **Using expression**:
```sql
bucket_id = 'transaction-files'
AND (storage.foldername(name))[1] = 'outcome'
AND EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = auth.uid()
  AND t.id::text = (storage.foldername(name))[4]
)
```
- กด **Save policy**

---

**Policy ที่ 3: ให้อัพโหลดไฟล์ได้**

- กด **New policy** > **For full customization**
- **Policy Name**: `Users can upload own files`
- **Allowed operations**: เลือก **INSERT**
- **Check expression** (ช่องล่าง):
```sql
bucket_id = 'transaction-files'
AND (storage.foldername(name))[1] IN ('income', 'outcome')
AND EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = auth.uid()
  AND t.id::text = (storage.foldername(name))[4]
)
```
- กด **Save policy**

---

**Policy ที่ 4: ให้ลบไฟล์ได้**

- กด **New policy** > **For full customization**
- **Policy Name**: `Users can delete own files`
- **Allowed operations**: เลือก **DELETE**
- **Using expression**:
```sql
bucket_id = 'transaction-files'
AND EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = auth.uid()
  AND t.id::text = (storage.foldername(name))[4]
)
```
- กด **Save policy**

---

## ขั้นตอนที่ 6: สร้าง User สำหรับเข้าสู่ระบบ

1. ใน Supabase Dashboard กดที่ **Authentication** (เมนูซ้าย)
2. กดที่ **Users**
3. กดปุ่ม **Add user** > เลือก **Create a new user**
4. กรอก:
   - **Email**: เช่น `test@test.com`
   - **Password**: เช่น `123456` (ต้องมี 6 ตัวขึ้นไป)
   - **Auto Confirm Email**: ติ๊กถูก (ON)
5. กด **Create user**
6. **สำคัญมาก**: จด **UUID** ของ user นี้ไว้ (จะเป็นตัวอักษรยาวๆ เช่น `a1b2c3d4-...`)
   - หา UUID ได้ที่ Authentication > Users > กดที่ user > จะเห็น ID

---

## ขั้นตอนที่ 7: ใส่ข้อมูลตัวอย่าง (Seed Data)

1. เปิดไฟล์ `supabase/seed.sql` ในโฟลเดอร์โปรเจค
2. ค้นหาคำว่า `YOUR_USER_ID` (กด Ctrl+H ใน Notepad++ หรือ Ctrl+H ใน VS Code)
3. แทนที่ทั้งหมดด้วย UUID จริงของ user ที่สร้างในขั้นตอนที่ 6
4. คัดลอกโค้ดทั้งหมดไปวางใน **SQL Editor** ของ Supabase
5. กด **Run**

---

## ขั้นตอนที่ 8: รันแอป

```
npm run dev
```

รอจนเห็นข้อความ:
```
▲ Next.js 16.x.x
- Local:   http://localhost:3000
```

เปิด browser ไปที่ **http://localhost:3000**

---

## วิธีใช้งาน

1. หน้า Login ใส่ email/password ที่สร้างในขั้นตอนที่ 6
2. หน้าหลักเลือก **รายรับ** หรือ **รายจ่าย**
3. สร้างรายการ + upload ไฟล์ตามต้องการ

---

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm install` | ติดตั้ง packages ทั้งหมด |
| `npm run dev` | รันแอปแบบ development |
| `npm run build` | สร้าง production build |
| `npm start` | รัน production build |

---

## แก้ปัญหาที่พบบ่อย

**`npm` ใช้ไม่ได้**
- ติดตั้ง Node.js ก่อน ที่ https://nodejs.org

**Supabase URL ผิด / ใช้ไม่ได้**
- ตรวจ `.env.local` ว่าใส่ URL ถูก (ต้องขึ้นต้น `https://` ลงท้าย `.supabase.co`)
- ตรวจว่าใส่ Publishable key ถูก (ขึ้นต้น `sb_publishable_`)

**สร้างตารางไม่ได้**
- ดู error ใน SQL Editor
- ต้องรัน schema.sql ก่อน seed.sql เสมอ

**Login ไม่ได้**
- ตรวจว่าสร้าง user ใน Authentication > Users แล้ว
- ตรวจ email/password ว่าถูกต้อง

**Upload ไฟล์ไม่ได้**
- ตรวจว่าสร้าง Storage Bucket ชื่อ `transaction-files` แล้ว
- ตรวจว่าสร้าง Policies ครบ 4 ตัว
