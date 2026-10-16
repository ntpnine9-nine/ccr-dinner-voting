# CCR Dinner Voting — คู่มือโครงการ

ระบบโหวตอาหารงานเลี้ยง CCR สำหรับร้านครัวซอย 11

## Release 1
- ผู้โหวตเปิดเว็บไซต์ได้โดยไม่ต้องสร้างบัญชี
- เลือก 1 เมนูจากแต่ละหมวด A–H รวม 8 หมวด
- ใช้ Invitation Code ส่วนตัวตอนกดส่งคะแนน
- รหัสเดิมแก้ใบโหวตเดิมได้ก่อนปิด Campaign
- คะแนนเก็บใน Supabase PostgreSQL
- Admin ใช้ Supabase Auth + `admin_users` allowlist
- Dashboard แสดงคะแนนรวมและ Decision Engine
- งบหลัก ≤ 2,000 บาท / พิจารณาพรีเมียม ≤ 2,200 บาท

## สถานะ Launch
Campaign จริงต้องอยู่ `closed` ระหว่างพัฒนาและทดสอบ
ห้ามเปิดโหวตจริงจนเจ้าของโครงการอนุมัติ

## URL เป้าหมาย
- Voter: https://ntpnine9-nine.github.io/ccr-dinner-voting/
- Admin: https://ntpnine9-nine.github.io/ccr-dinner-voting/admin.html

URL เหล่านี้ต้องเปิด GitHub Pages และตรวจจากเบราว์เซอร์จริงก่อนถือว่าใช้งาน Production ได้

อ่านต่อ: `docs/OPERATIONS_TH.md`, `docs/RECOVERY_TH.md`, `SECURITY.md`.
