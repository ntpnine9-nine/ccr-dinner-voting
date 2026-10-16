# CCR After Hours 2026 — คู่มือโครงการ

เว็บไซต์งานเลี้ยงปลายปี CCR วันที่ **ศุกร์ 18 ธันวาคม 2026** ที่ **ครัวซอย 11 เขตประเวศ กรุงเทพฯ**

## เว็บไซต์นี้ทำอะไร
แทนการกระจายข้อมูลหลายไฟล์ PDF / PowerPoint ระบบรวมไว้ในลิงก์เดียว:
- บัตรเชิญดิจิทัล / Save the Date
- สถานที่ แผนที่ และปุ่มนำทาง Google Maps
- Event Guide / Flow ของค่ำคืน / FAQ
- RSVP: ไปแน่นอน / ยังไม่แน่ใจ / ไม่สะดวก
- โหวตจับของขวัญ 4 ตัวเลือก
- โหวต Dress Mood 4 แบบ
- โหวตอาหาร 8 หมวด × 7 เมนู = 56 ตัวเลือก
- Dashboard ผู้จัดงาน
- Decision Engine เปรียบเทียบ Popularity / งบ 2,000 / งบ 2,200 บาท

## หน้าใช้งาน
- `index.html` — หน้าเชิญและศูนย์รวมงาน
- `venue.html` — ร้านจริง แผนที่จริง ภาพเมนูจริงที่ผู้จัดมี
- `party.html` — RSVP + ของขวัญ + Theme
- `vote.html` — โหวตอาหาร
- `guide.html` — คู่มืองานแบบ Live Document
- `admin.html` — Dashboard เฉพาะผู้จัดงานที่ได้รับสิทธิ์

## หลักความปลอดภัย
- พนักงานไม่ต้องสร้าง Account
- การส่งคำตอบต้องใช้ Invitation Code ส่วนตัว
- ระบบเก็บรหัสเป็น Hash ไม่เก็บรหัสเต็ม
- รหัสเดิมแก้คำตอบเดิมได้ก่อนปิด Campaign
- ผล Public ไม่แสดงคำตอบรายบุคคล
- Admin ต้องผ่าน Supabase Auth และมี UUID อยู่ใน `public.admin_users`

## สถานะ Launch
Campaign จริงต้องอยู่ `closed` ระหว่างพัฒนาและตรวจสอบ
ห้ามเปิดโหวตจริงจนเจ้าของโครงการสั่ง **“อนุมัติเปิดโหวตจริง”**

อ่านต่อ: `docs/OPERATIONS_TH.md`, `docs/RECOVERY_TH.md`, `docs/PRODUCTION_ACCEPTANCE.md`, `SECURITY.md`.
