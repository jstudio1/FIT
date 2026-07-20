// server.js — Entry point สำหรับ Plesk (Phusion Passenger)
// ใช้เฉพาะบนโฮสต์ Production; ตอน dev ในเครื่องยังใช้ `npm run dev` ตามปกติ
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Trainner พร้อมทำงานที่พอร์ต ${port}`);
  });
});
