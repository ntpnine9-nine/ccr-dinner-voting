# Recovery / Rollback Guide

- GitHub `main` เป็น canonical source สำหรับ frontend/function/migrations หลัง reconciliation เสร็จ
- Database changes ใช้ forward-only migrations; ห้าม reset production project
- ถ้า Edge Function รุ่นใหม่ผิดพลาด ให้ redeploy source รุ่นก่อนจาก Git history
- ถ้า Public site มีปัญหา ให้ rollback GitHub commit หรือแก้เฉพาะ static source แล้ว redeploy Pages
- Campaign ควร CLOSED ระหว่างแก้ incident เพื่อลดความเสี่ยงข้อมูล
- ห้ามลบ Ballots จริงเพื่อแก้ปัญหา UI; แยก UI bug ออกจาก data integrity
