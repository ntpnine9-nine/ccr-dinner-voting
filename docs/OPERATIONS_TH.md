# คู่มือใช้งานผู้จัดงาน — CCR Dinner Voting

## ก่อนเปิดโหวตจริง
1. ตรวจเว็บ Public และ Admin URL จากอุปกรณ์ภายนอก
2. เปลี่ยน Password ที่เคยเปิดเผย
3. อนุมัติ Auth User ที่ต้องการเป็น Admin แล้วเพิ่ม UUID เข้า `public.admin_users`
4. สร้างรหัสเชิญจริงตามจำนวนผู้มีสิทธิ์
5. ดาวน์โหลด CSV รหัสเชิญและเก็บเป็นความลับ
6. ตรวจ Ballot จริง = 0 และ Campaign = CLOSED
7. ได้รับคำสั่งเจ้าของโครงการ `อนุมัติเปิดโหวตจริง` แล้วจึงเปิด

## ระหว่างโหวต
- พนักงานเปิด Public URL/QR ได้ทันที ไม่ต้อง Login
- เลือก A-H ให้ครบ แล้วใส่ Invitation Code ตอน Submit
- รหัสเดิมแก้ใบโหวตเดิมได้จนปิด Campaign
- Dashboard แสดง Aggregate Results เฉพาะ Admin

## ปิดโหวต
1. กดปิดรับโหวต
2. ตรวจจำนวน Ballots/Invites
3. Freeze ผลหากต้องการล็อก Catalog/ผลขั้นสุดท้าย
4. เปรียบเทียบ Popularity / Standard ≤ 2,000 / Premium ≤ 2,200
5. Export CSV/JSON
6. ยืนยันราคา/ปริมาณกับร้านก่อนอนุมัติรายการสั่งจริง
