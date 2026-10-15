# CMC Global GVN - 20/10 Spin Wheel 🌸

Website quay quà ngày 20/10 cho chị em GVN.

## Cấu trúc project

```
├── server.js          # Entry point
├── database.js        # SQLite setup + seed data
├── package.json
├── routes/
│   ├── api.js         # API: login, user info, gifts, spin
│   └── admin.js       # CMS admin panel
├── public/
│   └── index.html     # Frontend: login + spin wheel
├── uploads/           # Avatar & gift images (tự tạo)
└── data.db            # SQLite DB (tự tạo khi chạy lần đầu)
```

## Cài đặt & Chạy

```bash
npm install
npm start
```

- **Website:** http://localhost:3000
- **Admin CMS:** http://localhost:3000/admin
  - Tài khoản: `manhdd2` / mật khẩu: `manhdd2`

## Deploy lên hosting

### Option 1: VPS / cPanel với Node.js
1. Upload toàn bộ code (trừ `node_modules`)
2. Chạy `npm install` trên server
3. Chạy `npm start` hoặc dùng PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name gvn2010
   pm2 save
   ```

### Option 2: Railway / Render / Fly.io (free)
1. Push code lên GitHub
2. Connect repo với Railway/Render
3. Set start command: `npm start`
4. **Lưu ý:** Với hosting free cần dùng volume để persist `data.db` và `uploads/`

### Biến môi trường (tùy chọn)
```
PORT=3000
```

## Tính năng

### Website (/)
- Login bằng LDAP (22 người cố định)
- Vòng quay may mắn với Canvas animation
- Hiệu ứng confetti khi trúng quà
- Validate 1 lần quay / người
- Responsive mobile

### Admin CMS (/admin)
- Dashboard thống kê (đã quay / chưa quay / kho quà)
- Danh sách đầy đủ với trạng thái từng người
- Config quà: tên, hình ảnh, số lượng, tỉ lệ, màu sắc
- Set avatar + tên + lời chúc cho từng LDAP
- Reset lượt quay từng người (nếu cần)
