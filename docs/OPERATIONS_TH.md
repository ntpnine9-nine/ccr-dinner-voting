# คู่มือใช้งานผู้จัดงาน — CCR After Hours 2026

## 1. ก่อนเปิดโหวตจริง
1. ตรวจหน้า Home / Venue / Party / Food Vote / Guide / Admin จากอุปกรณ์ภายนอก
2. ตรวจบัญชี Admin ว่า Login ได้และ UUID อยู่ใน `public.admin_users`
3. เปลี่ยนรหัสผ่านเดิมทันทีถ้าเคยถูกเปิดเผย
4. ยืนยันจำนวนผู้มีสิทธิ์เข้าร่วม
5. สร้าง Invitation Code จริงตามจำนวนที่อนุมัติ
6. ดาวน์โหลด CSV รหัสเชิญและเก็บเป็นความลับ
7. ตรวจ Ballots = 0, Event Preferences = 0, Campaign = CLOSED
8. ได้รับคำสั่งเจ้าของโครงการ **“อนุมัติเปิดโหวตจริง”** แล้วจึงเปิด

## 2. ระหว่างเปิดรับคำตอบ
พนักงาน:
- เปิดลิงก์งานได้โดยไม่ Login
- RSVP / Gift / Theme ที่ `party.html`
- Food Vote ที่ `vote.html`
- ใช้ Invitation Code เดียวกันตอนบันทึก
- ส่งซ้ำด้วยรหัสเดิม = อัปเดตคำตอบเดิม ไม่เพิ่มจำนวนคน

ผู้จัดงาน:
- Login ที่ `admin.html`
- ดูจำนวนใบโหวต / Invite / Participation
- ดู Aggregate RSVP / Gift / Theme
- ดูอันดับอาหาร 8 หมวด
- ยกเลิกรหัสเชิญที่ต้องการได้

## 3. หลังปิดโหวต
1. ปิด Campaign
2. ตรวจจำนวน Ballots / Event Preferences / Invites
3. Freeze ผลเมื่อพร้อมล็อกผล
4. Food Decision Engine:
   - Popularity Winner
   - Standard Budget Optimized ≤ 2,000 บาท
   - Premium Budget Optimized ≤ 2,200 บาท
5. สรุป Gift / Dress Mood
6. ยืนยันรายชื่อผู้ร่วมงานจริงก่อนทำ Gift Pairing
7. ยืนยันราคาอาหาร ปริมาณ โต๊ะ เวลา และ availability กับร้าน
8. Export CSV / JSON ที่จำเป็น
9. Owner อนุมัติรายการสั่งจริงแยกจากผลโหวต

## 4. ข้อมูลที่ยัง Pending
- เวลาเริ่มงาน Final
- จำนวนโต๊ะ Final
- ที่จอดรถ / การจัดโต๊ะเฉพาะวันงาน
- ราคาและ availability อาหารวันจริง
- Gift Pairing รายบุคคล (ทำหลังยืนยันผู้ร่วมงาน)

อย่าใส่ข้อมูลสมมติลงเว็บแทนข้อมูลที่ยังไม่ยืนยัน
