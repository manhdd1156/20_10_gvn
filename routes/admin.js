const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Admin credentials
const ADMIN_USER = 'manhdd2';
const ADMIN_PASS = 'manhdd2';

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.adminLoggedIn) return next();
  if (req.path === '/login' || req.path === '/login-post') return next();
  res.redirect('/admin/login');
}

router.use(requireAuth);

// Login page
router.get('/login', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login - GVN 20/10</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: linear-gradient(135deg, #fce4ec, #f8bbd0, #fce4ec); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 60px rgba(108,35,56,0.15); width: 380px; text-align: center; }
  h1 { color: #6c2338; font-size: 1.6rem; margin-bottom: 8px; }
  p { color: #888; font-size: 0.9rem; margin-bottom: 28px; }
  input { width: 100%; padding: 13px 16px; border: 2px solid #f8bbd0; border-radius: 12px; font-size: 1rem; margin-bottom: 14px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  input:focus { border-color: #c93d5d; }
  button { width: 100%; padding: 14px; background: linear-gradient(135deg, #d34265, #b82b4f); color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; font-family: inherit; }
  button:hover { opacity: 0.92; }
  .error { color: #c62828; background: #ffebee; padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem; }
  .heart { color: #c93d5d; font-size: 1.8rem; margin-bottom: 12px; }
</style>
</head>
<body>
<div class="card">
  <div class="heart">🌸</div>
  <h1>CMC Global GVN</h1>
  <p>Trang quản trị CMS 20/10</p>
  ${req.query.error ? '<div class="error">Sai tài khoản hoặc mật khẩu!</div>' : ''}
  <form method="POST" action="/admin/login-post">
    <input type="text" name="username" placeholder="Tài khoản (manhdd2)" required>
    <input type="password" name="password" placeholder="Mật khẩu (manhdd2)" required>
    <button type="submit">Đăng nhập</button>
  </form>
</div>
</body>
</html>`);
});

router.post('/login-post', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.adminLoggedIn = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Main admin page
router.get('/', (req, res) => {
  const rawUsers = db.getUsers();
  const rawGifts = db.getGifts();

  const giftsMap = {};
  rawGifts.forEach(g => { giftsMap[g.id] = g; });

  const users = rawUsers.map(u => {
    const g = u.gift_id ? giftsMap[u.gift_id] : null;
    return {
      ...u,
      gift_name: g ? g.name : '',
      gift_image: g ? g.image : ''
    };
  }).sort((a, b) => {
    if (a.spun !== b.spun) return b.spun - a.spun;
    return (b.spun_at || '').localeCompare(a.spun_at || '');
  });

  const gifts = [...rawGifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const totalSpun = users.filter(u => u.spun).length;
  const totalNotSpun = users.filter(u => !u.spun).length;

  res.send(generateAdminHTML(users, gifts, totalSpun, totalNotSpun));
});

// Update user (including cropped avatar data URL or file)
router.post('/user/:ldap', upload.single('avatar'), (req, res) => {
  const { display_name, wish, avatar_cropped } = req.body;
  const ldap = req.params.ldap;

  const updateFields = {
    display_name,
    wish
  };

  // If user used drag & zoom cropper, avatar_cropped will contain base64 image data
  if (avatar_cropped && avatar_cropped.startsWith('data:image/')) {
    try {
      const matches = avatar_cropped.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].replace('jpeg', 'jpg');
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `${Date.now()}_cropped.${ext}`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);
        fs.writeFileSync(filePath, buffer);
        updateFields.avatar = '/uploads/' + fileName;
      }
    } catch (e) {
      console.error('Error saving cropped avatar:', e);
    }
  } else if (req.file) {
    updateFields.avatar = '/uploads/' + req.file.filename;
  }

  db.updateUser(ldap, updateFields);
  res.redirect('/admin#users');
});

// Reset user spin
router.post('/user/:ldap/reset', (req, res) => {
  const user = db.getUserByLdap(req.params.ldap);
  if (user && user.gift_id) {
    const gift = db.getGiftById(user.gift_id);
    if (gift) {
      db.updateGift(gift.id, { remaining: (gift.remaining || 0) + 1 });
    }
  }
  db.updateUser(req.params.ldap, {
    spun: 0,
    gift_id: null,
    spun_at: null
  });
  res.redirect('/admin#users');
});

// Add gift
router.post('/gift/add', upload.single('image'), (req, res) => {
  const { name, quantity, weight, color, sort_order } = req.body;
  const qty = parseInt(quantity) || 1;
  const image = req.file ? '/uploads/' + req.file.filename : '';

  db.addGift({
    name,
    image,
    quantity: qty,
    remaining: qty,
    weight: parseInt(weight) || 1,
    color: color || '#fcd3de',
    sort_order: parseInt(sort_order) || 0,
    active: 1
  });

  res.redirect('/admin#gifts');
});

// Update gift
router.post('/gift/:id', upload.single('image'), (req, res) => {
  const { name, quantity, weight, color, sort_order, active } = req.body;
  const id = req.params.id;
  const gift = db.getGiftById(id);
  if (!gift) return res.redirect('/admin#gifts');

  const qty = parseInt(quantity) || 1;
  const diff = qty - (gift.quantity || 0);
  const newRemaining = Math.max(0, (gift.remaining || 0) + diff);
  const image = req.file ? '/uploads/' + req.file.filename : (gift.image || '');

  db.updateGift(id, {
    name,
    image,
    quantity: qty,
    remaining: newRemaining,
    weight: parseInt(weight) || 1,
    color: color || '#fcd3de',
    sort_order: parseInt(sort_order) || 0,
    active: active === 'on' ? 1 : 0
  });

  res.redirect('/admin#gifts');
});

// Delete gift
router.post('/gift/:id/delete', (req, res) => {
  db.deleteGift(req.params.id);
  res.redirect('/admin#gifts');
});

function generateAdminHTML(users, gifts, totalSpun, totalNotSpun) {
  const usersHTML = users.map(u => `
    <tr class="${u.spun ? 'spun' : ''}">
      <td>
        <div class="user-cell">
          ${u.avatar ? `<img src="${u.avatar}" class="avatar-small">` : '<div class="no-avatar">?</div>'}
          <div>
            <div class="ldap">${u.ldap}</div>
            <div class="dname">${u.display_name}</div>
          </div>
        </div>
      </td>
      <td>${u.spun ? `<span class="badge badge-done">✅ Đã quay</span>` : '<span class="badge badge-pending">⏳ Chưa quay</span>'}</td>
      <td>${u.gift_name ? `<span class="gift-tag">${u.gift_name}</span>` : '-'}</td>
      <td>${u.spun_at ? new Date(u.spun_at).toLocaleString('vi-VN') : '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-copy-link" onclick="copyUserLink('${u.ldap}','${escapeJs(u.display_name)}')">🔗 Copy Link</button>
          <button class="btn-edit" onclick="editUser('${u.ldap}','${escapeJs(u.display_name)}','${escapeJs(u.wish || '')}','${u.avatar || ''}')">✏️ Sửa / Chỉnh Avatar</button>
          ${u.spun ? `<form method="POST" action="/admin/user/${u.ldap}/reset" onsubmit="return confirm('Reset lượt quay của ${u.display_name}?')" style="display:inline"><button class="btn-reset">🔄 Reset</button></form>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  const giftsHTML = gifts.map(g => `
    <div class="gift-card">
      <div class="gift-color-dot" style="background:${g.color}"></div>
      ${g.image ? `<img src="${g.image}" class="gift-img">` : '<div class="no-gift-img">🎁</div>'}
      <div class="gift-info">
        <div class="gift-name">${g.name}</div>
        <div class="gift-stats">
          <span class="stat ${g.remaining === 0 ? 'zero' : ''}">Còn: <b>${g.remaining}</b>/${g.quantity}</span>
          <span class="stat">Tỉ lệ: <b>${g.weight}</b></span>
          <span class="stat ${g.active ? 'active' : 'inactive'}">${g.active ? '✅ Hiện' : '❌ Ẩn'}</span>
        </div>
      </div>
      <div class="gift-actions">
        <button class="btn-edit" onclick="editGift(${g.id},'${escapeJs(g.name)}',${g.quantity},${g.weight},'${g.color}',${g.sort_order || 0},${g.active},'${g.image || ''}')">✏️ Sửa</button>
        <form method="POST" action="/admin/gift/${g.id}/delete" onsubmit="return confirm('Xóa quà ${g.name}?')" style="display:inline">
          <button class="btn-delete">🗑️ Xóa</button>
        </form>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin CMS - GVN 20/10</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fdf0f5; color: #333; }
  
  .header { background: linear-gradient(135deg, #d34265, #6c2338); color: white; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(108,35,56,0.15); }
  .header h1 { font-size: 1.25rem; font-weight: 700; }
  .header a { color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 10px; font-size: 0.88rem; font-weight: 600; transition: background 0.2s; }
  .header a:hover { background: rgba(255,255,255,0.3); }
  
  .nav-tabs { background: white; padding: 0 32px; border-bottom: 2px solid #f8bbd0; display: flex; gap: 4px; }
  .nav-tab { padding: 14px 22px; cursor: pointer; font-weight: 700; color: #8c5666; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
  .nav-tab.active { color: #c93d5d; border-bottom-color: #c93d5d; }
  
  .content { padding: 28px 32px; max-width: 1400px; margin: 0 auto; }
  
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(108,35,56,0.05); border-left: 5px solid #c93d5d; }
  .stat-card .num { font-size: 2.2rem; font-weight: 800; color: #6c2338; }
  .stat-card .label { color: #888; font-size: 0.85rem; margin-top: 4px; font-weight: 600; }
  
  .panel { display: none; }
  .panel.active { display: block; }
  
  /* Users table */
  .table-wrap { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 15px rgba(108,35,56,0.05); }
  table { width: 100%; border-collapse: collapse; }
  th { background: #fce4ec; color: #6c2338; font-weight: 700; padding: 14px 18px; text-align: left; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 14px 18px; border-bottom: 1px solid #fce4ec; vertical-align: middle; font-size: 0.92rem; }
  tr.spun { background: #fffafc; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fdf2f6; }
  
  .user-cell { display: flex; align-items: center; gap: 12px; }
  .avatar-small { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #f8bbd0; }
  .no-avatar { width: 44px; height: 44px; border-radius: 50%; background: #f8bbd0; display: flex; align-items: center; justify-content: center; color: #c93d5d; font-weight: 800; }
  .ldap { font-family: monospace; font-size: 0.82rem; color: #c93d5d; background: #fce4ec; padding: 3px 8px; border-radius: 6px; display: inline-block; font-weight: 700; }
  .dname { font-weight: 700; color: #333; margin-top: 3px; font-size: 0.95rem; }
  
  .badge { padding: 5px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; }
  .badge-done { background: #e8f5e9; color: #2e7d32; }
  .badge-pending { background: #fff3e0; color: #e65100; }
  .gift-tag { background: #fce4ec; color: #c93d5d; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
  
  .action-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn-copy-link { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; transition: all 0.2s; font-family: inherit; }
  .btn-copy-link:hover { background: #2e7d32; color: white; }
  .btn-edit { background: #fce4ec; color: #c93d5d; border: 1px solid #f8bbd0; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; transition: all 0.2s; font-family: inherit; }
  .btn-edit:hover { background: #c93d5d; color: white; }
  .btn-reset { background: #fff3e0; color: #e65100; border: none; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; transition: background 0.2s; font-family: inherit; }
  .btn-reset:hover { background: #ffe0b2; }
  .btn-delete { background: #ffebee; color: #c62828; border: none; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; transition: background 0.2s; font-family: inherit; }
  .btn-delete:hover { background: #ffcdd2; }
  
  #adminToast { position: fixed; bottom: 30px; right: 30px; background: #2e7d32; color: white; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 9999; display: none; animation: slideUpToast 0.3s ease; }
  @keyframes slideUpToast { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  
  /* Gifts */
  .gifts-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .gifts-header h2 { color: #6c2338; font-size: 1.3rem; }
  .btn-primary { background: linear-gradient(135deg, #d34265, #b82b4f); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-size: 0.95rem; font-weight: 700; transition: opacity 0.2s; font-family: inherit; box-shadow: 0 4px 12px rgba(184,43,79,0.25); }
  .btn-primary:hover { opacity: 0.92; }
  
  .gifts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 18px; }
  .gift-card { background: white; border-radius: 16px; padding: 18px; box-shadow: 0 4px 15px rgba(108,35,56,0.05); display: flex; align-items: center; gap: 14px; }
  .gift-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
  .gift-img { width: 54px; height: 54px; border-radius: 10px; object-fit: cover; }
  .no-gift-img { width: 54px; height: 54px; border-radius: 10px; background: #fce4ec; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; }
  .gift-info { flex: 1; }
  .gift-name { font-weight: 800; color: #6c2338; margin-bottom: 4px; font-size: 1rem; }
  .gift-stats { display: flex; gap: 8px; flex-wrap: wrap; }
  .stat { font-size: 0.8rem; color: #666; font-weight: 500; }
  .stat.zero { color: #e53935; font-weight: 700; }
  .stat.active { color: #2e7d32; font-weight: 700; }
  .stat.inactive { color: #999; }
  .gift-actions { display: flex; gap: 6px; flex-direction: column; }
  
  /* Modal */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(84,21,41,0.5); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; }
  .modal-overlay.open { display: flex; }
  .modal { background: white; border-radius: 24px; padding: 32px; width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
  .modal h3 { color: #6c2338; margin-bottom: 20px; font-size: 1.3rem; font-weight: 800; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; color: #666; font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; }
  .form-group input[type="text"], .form-group textarea, .form-group input[type="number"], .form-group select { width: 100%; padding: 12px 16px; border: 2px solid #f8bbd0; border-radius: 12px; font-size: 0.95rem; font-family: inherit; outline: none; transition: border-color 0.2s; }
  .form-group input:focus, .form-group textarea:focus { border-color: #c93d5d; }
  .form-group textarea { resize: vertical; min-height: 80px; }
  .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  .btn-secondary { background: #f0f0f0; color: #555; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-size: 0.95rem; font-weight: 700; font-family: inherit; }

  /* ===== INTERACTIVE CROPPER TOOL ===== */
  .cropper-box {
    background: #fdf2f5;
    border: 2px dashed #f8bbd0;
    border-radius: 18px;
    padding: 18px;
    text-align: center;
    margin-bottom: 16px;
  }
  .cropper-viewport-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 14px 0;
  }
  .cropper-viewport {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 4px solid #c93d5d;
    box-shadow: 0 8px 25px rgba(201,61,93,0.25);
    position: relative;
    overflow: hidden;
    background: #e0d0d8;
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  .cropper-viewport:active {
    cursor: grabbing;
  }
  .cropper-img {
    position: absolute;
    pointer-events: none;
    transform-origin: center center;
    max-width: none;
    display: none;
  }
  .cropper-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 10px;
  }
  .cropper-controls input[type="range"] {
    width: 180px;
    accent-color: #c93d5d;
  }
  .cropper-hint {
    font-size: 0.8rem;
    color: #8c5666;
    margin-top: 6px;
    font-style: italic;
  }
  .btn-crop-reset {
    background: #fff;
    border: 1px solid #f8bbd0;
    color: #6c2338;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
  
  .section-title { color: #6c2338; font-size: 1.15rem; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

  /* Gift stats table */
  .gift-stats-table { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 15px rgba(108,35,56,0.05); }
  .progress-bar { background: #f8bbd0; border-radius: 4px; height: 8px; overflow: hidden; margin-top: 4px; }
  .progress-fill { background: linear-gradient(90deg, #d34265, #b82b4f); height: 100%; border-radius: 4px; transition: width 0.3s; }
  
  @media (max-width: 768px) {
    .content { padding: 16px; }
    .nav-tabs { padding: 0 16px; overflow-x: auto; }
    .gifts-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>🌸 CMC Global GVN - Admin CMS 20/10</h1>
  <div style="display:flex;gap:12px;align-items:center;">
    <a href="/" target="_blank">🎡 Mở trang quay quà</a>
    <a href="/admin/logout">Đăng xuất</a>
  </div>
</div>

<div class="nav-tabs">
  <div class="nav-tab active" onclick="showTab('dashboard')" id="tab-dashboard">📊 Tổng quan</div>
  <div class="nav-tab" onclick="showTab('users')" id="tab-users">👩 Danh sách (${users.length})</div>
  <div class="nav-tab" onclick="showTab('gifts')" id="tab-gifts">🎁 Config quà (${gifts.length})</div>
</div>

<div class="content">
  <!-- Dashboard -->
  <div class="panel active" id="panel-dashboard">
    <div class="stats">
      <div class="stat-card">
        <div class="num">${users.length}</div>
        <div class="label">Tổng số người</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:#2e7d32">${totalSpun}</div>
        <div class="label">Đã quay nhận quà</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:#e65100">${totalNotSpun}</div>
        <div class="label">Chưa quay</div>
      </div>
      <div class="stat-card">
        <div class="num">${gifts.length}</div>
        <div class="label">Loại quà</div>
      </div>
    </div>

    <div class="section-title">🎁 Tình trạng kho quà</div>
    <div class="gift-stats-table">
      <table>
        <thead>
          <tr><th>Tên quà</th><th>Số lượng</th><th>Đã phát</th><th>Còn lại</th><th>Tỉ lệ</th><th>Tiến độ</th></tr>
        </thead>
        <tbody>
          ${gifts.map(g => {
            const used = (g.quantity || 0) - (g.remaining || 0);
            const pct = (g.quantity || 0) > 0 ? Math.round(used / g.quantity * 100) : 0;
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:10px"><div style="width:14px;height:14px;border-radius:50%;background:${g.color || '#fcd3de'};flex-shrink:0"></div>${g.name}</div></td>
              <td><b>${g.quantity || 0}</b></td>
              <td><b style="color:#c93d5d">${used}</b></td>
              <td><b style="color:${g.remaining === 0 ? '#e53935' : '#2e7d32'}">${g.remaining || 0}</b></td>
              <td>${g.weight || 1}</td>
              <td style="min-width:110px">
                <div>${pct}%</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-title" style="margin-top:28px">📋 Người đã nhận quà (${users.filter(u => u.spun).length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Người dùng</th><th>Quà nhận được</th><th>Thời gian quay</th></tr>
        </thead>
        <tbody>
          ${users.filter(u => u.spun).length === 0
            ? '<tr><td colspan="3" style="text-align:center;color:#999;padding:24px">Chưa có ai quay</td></tr>'
            : users.filter(u => u.spun).map(u => `
            <tr>
              <td><div class="user-cell">
                ${u.avatar ? `<img src="${u.avatar}" class="avatar-small">` : '<div class="no-avatar">?</div>'}
                <div><div class="ldap">${u.ldap}</div><div class="dname">${u.display_name}</div></div>
              </div></td>
              <td>${u.gift_name ? `<span class="gift-tag">${u.gift_name}</span>` : '-'}</td>
              <td>${u.spun_at ? new Date(u.spun_at).toLocaleString('vi-VN') : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Users panel -->
  <div class="panel" id="panel-users">
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Người dùng</th><th>Trạng thái</th><th>Quà nhận</th><th>Thời gian quay</th><th>Thao tác</th></tr>
        </thead>
        <tbody>${usersHTML}</tbody>
      </table>
    </div>
  </div>

  <!-- Gifts panel -->
  <div class="panel" id="panel-gifts">
    <div class="gifts-header">
      <h2>🎁 Danh sách quà trong vòng quay</h2>
      <button class="btn-primary" onclick="openAddGift()">+ Thêm quà mới</button>
    </div>
    <div class="gifts-grid">${giftsHTML}</div>
  </div>
</div>

<!-- Edit User Modal with Interactive Avatar Zoom & Drag Cropper -->
<div class="modal-overlay" id="editUserModal">
  <div class="modal">
    <h3>✏️ Chỉnh sửa thông tin & Avatar</h3>
    <form method="POST" id="editUserForm" onsubmit="prepareCroppedAvatar(event)">
      <!-- Hidden base64 output -->
      <input type="hidden" name="avatar_cropped" id="avatarCroppedData">

      <div class="form-group">
        <label>Chọn ảnh đại diện từ máy tính</label>
        <input type="file" id="avatarFileInput" accept="image/*" onchange="loadAvatarImage(this)">
      </div>

      <!-- Live Drag & Zoom Cropper Tool -->
      <div class="cropper-box">
        <div style="font-weight:700;font-size:0.88rem;color:#6c2338;">🎯 Căn chỉnh góc bo tròn (Kéo để di chuyển vị trí, thanh trượt để Zoom)</div>
        <div class="cropper-viewport-wrap">
          <div class="cropper-viewport" id="cropperViewport">
            <img id="cropperImg" class="cropper-img" alt="avatar source">
          </div>
        </div>
        <div class="cropper-controls">
          <span style="font-size:0.85rem;font-weight:600;">🔍 Zoom:</span>
          <input type="range" id="zoomSlider" min="0.5" max="3" step="0.02" value="1" oninput="applyZoom(this.value)">
          <button type="button" class="btn-crop-reset" onclick="resetCrop()">Về giữa</button>
        </div>
        <div class="cropper-hint">💡 Giữ chuột/chạm vào vòng tròn trên để kéo bức ảnh vào vị trí khuôn mặt đẹp nhất!</div>
      </div>

      <div class="form-group">
        <label>Tên hiển thị</label>
        <input type="text" name="display_name" id="editDisplayName" required>
      </div>
      <div class="form-group">
        <label>Lời chúc dành riêng</label>
        <textarea name="wish" id="editWish" rows="4"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal('editUserModal')">Hủy</button>
        <button type="submit" class="btn-primary" id="btnSaveUser">💾 Lưu thông tin</button>
      </div>
    </form>
  </div>
</div>

<!-- Edit Gift Modal -->
<div class="modal-overlay" id="editGiftModal">
  <div class="modal">
    <h3 id="giftModalTitle">🎁 Thêm quà mới</h3>
    <form method="POST" id="editGiftForm" enctype="multipart/form-data">
      <div class="form-group">
        <label>Tên quà</label>
        <input type="text" name="name" id="giftName" required>
      </div>
      <div class="form-group">
        <label>Hình ảnh quà (tùy chọn)</label>
        <input type="file" name="image" accept="image/*">
      </div>
      <div class="form-group">
        <label>Số lượng tổng</label>
        <input type="number" name="quantity" id="giftQty" min="1" value="1" required>
      </div>
      <div class="form-group">
        <label>Tỉ lệ trúng (trọng số càng cao càng dễ trúng)</label>
        <input type="number" name="weight" id="giftWeight" min="1" value="1" required>
      </div>
      <div class="form-group">
        <label>Màu ô trên vòng quay</label>
        <input type="color" name="color" id="giftColor" value="#fcd3de">
      </div>
      <div class="form-group">
        <label>Thứ tự hiển thị</label>
        <input type="number" name="sort_order" id="giftOrder" value="0">
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" name="active" id="giftActive" checked style="width:auto">
          Hiển thị trong vòng quay
        </label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal('editGiftModal')">Hủy</button>
        <button type="submit" class="btn-primary">💾 Lưu</button>
      </div>
    </form>
  </div>
</div>

<script>
function showTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');
  const clickedTab = document.getElementById('tab-' + tab);
  if (clickedTab) clickedTab.classList.add('active');
}

// Tự động chọn tab theo hash URL (ví dụ: #gifts hoặc #users khi lưu xong)
if (window.location.hash) {
  const hash = window.location.hash.substring(1);
  if (['dashboard', 'users', 'gifts'].includes(hash)) {
    showTab(hash);
  }
}
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.substring(1);
  if (['dashboard', 'users', 'gifts'].includes(hash)) {
    showTab(hash);
  }
});

// ===== Interactive Cropper State & Logic =====
const cropperViewport = document.getElementById('cropperViewport');
const cropperImg = document.getElementById('cropperImg');
const zoomSlider = document.getElementById('zoomSlider');

let cropState = {
  imgLoaded: false,
  naturalWidth: 0,
  naturalHeight: 0,
  scale: 1,
  baseScale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  hasChanged: false
};

function editUser(ldap, name, wish, avatar) {
  document.getElementById('editUserForm').action = '/admin/user/' + ldap;
  document.getElementById('editDisplayName').value = name;
  document.getElementById('editWish').value = wish;
  document.getElementById('avatarCroppedData').value = '';
  document.getElementById('avatarFileInput').value = '';

  if (avatar) {
    cropperImg.onload = function() {
      setupCropperInitial(this);
    };
    cropperImg.src = avatar;
    cropperImg.style.display = 'block';
    if (cropperImg.complete && cropperImg.naturalWidth > 0) {
      setupCropperInitial(cropperImg);
    }
  } else {
    cropperImg.src = '';
    cropperImg.style.display = 'none';
    cropState.imgLoaded = false;
  }

  openModal('editUserModal');
}

function loadAvatarImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      cropperImg.src = e.target.result;
      cropperImg.style.display = 'block';
      cropperImg.onload = function() {
        setupCropperInitial(this);
        cropState.hasChanged = true;
      };
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function setupCropperInitial(img) {
  const vpSize = 220; // 220px viewport
  cropState.imgLoaded = true;
  cropState.naturalWidth = img.naturalWidth;
  cropState.naturalHeight = img.naturalHeight;

  // Fit image to cover the circle
  cropState.baseScale = Math.max(vpSize / img.naturalWidth, vpSize / img.naturalHeight);
  cropState.scale = 1;
  zoomSlider.value = 1;

  cropState.offsetX = 0;
  cropState.offsetY = 0;
  updateImgTransform();
}

function applyZoom(val) {
  cropState.scale = parseFloat(val);
  cropState.hasChanged = true;
  updateImgTransform();
}

function resetCrop() {
  cropState.offsetX = 0;
  cropState.offsetY = 0;
  cropState.scale = 1;
  zoomSlider.value = 1;
  cropState.hasChanged = true;
  updateImgTransform();
}

function updateImgTransform() {
  if (!cropState.imgLoaded) return;
  const vpSize = 220;
  const currentTotalScale = cropState.baseScale * cropState.scale;
  const renderedW = cropState.naturalWidth * currentTotalScale;
  const renderedH = cropState.naturalHeight * currentTotalScale;

  // Center coordinate + user offsets
  const left = (vpSize - renderedW) / 2 + cropState.offsetX;
  const top = (vpSize - renderedH) / 2 + cropState.offsetY;

  cropperImg.style.width = renderedW + 'px';
  cropperImg.style.height = renderedH + 'px';
  cropperImg.style.left = left + 'px';
  cropperImg.style.top = top + 'px';
}

// Mouse / Touch Dragging on circular viewport
cropperViewport.addEventListener('mousedown', e => {
  if (!cropState.imgLoaded) return;
  cropState.isDragging = true;
  cropState.startX = e.clientX - cropState.offsetX;
  cropState.startY = e.clientY - cropState.offsetY;
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!cropState.isDragging) return;
  cropState.offsetX = e.clientX - cropState.startX;
  cropState.offsetY = e.clientY - cropState.startY;
  cropState.hasChanged = true;
  updateImgTransform();
});

window.addEventListener('mouseup', () => {
  cropState.isDragging = false;
});

// Touch support for tablets/smartphones
cropperViewport.addEventListener('touchstart', e => {
  if (!cropState.imgLoaded || !e.touches[0]) return;
  cropState.isDragging = true;
  cropState.startX = e.touches[0].clientX - cropState.offsetX;
  cropState.startY = e.touches[0].clientY - cropState.offsetY;
});

window.addEventListener('touchmove', e => {
  if (!cropState.isDragging || !e.touches[0]) return;
  cropState.offsetX = e.touches[0].clientX - cropState.startX;
  cropState.offsetY = e.touches[0].clientY - cropState.startY;
  cropState.hasChanged = true;
  updateImgTransform();
});

window.addEventListener('touchend', () => {
  cropState.isDragging = false;
});

// Mouse wheel zoom
cropperViewport.addEventListener('wheel', e => {
  if (!cropState.imgLoaded) return;
  e.preventDefault();
  let newScale = cropState.scale - e.deltaY * 0.002;
  newScale = Math.min(Math.max(0.5, newScale), 3);
  zoomSlider.value = newScale;
  applyZoom(newScale);
}, { passive: false });

// Export the visual crop to a high-res circle/square canvas on submit
function prepareCroppedAvatar(e) {
  if (cropState.imgLoaded && cropState.hasChanged) {
    const vpSize = 220;
    const outputSize = 400; // 400x400 high-res avatar
    const ratio = outputSize / vpSize;

    const currentTotalScale = cropState.baseScale * cropState.scale;
    const renderedW = cropState.naturalWidth * currentTotalScale;
    const renderedH = cropState.naturalHeight * currentTotalScale;
    const left = (vpSize - renderedW) / 2 + cropState.offsetX;
    const top = (vpSize - renderedH) / 2 + cropState.offsetY;

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    // Draw the image exactly aligned with the viewport
    ctx.drawImage(
      cropperImg,
      left * ratio,
      top * ratio,
      renderedW * ratio,
      renderedH * ratio
    );

    // Save as JPEG / PNG data URL
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    document.getElementById('avatarCroppedData').value = croppedDataUrl;
  }
}

// ===== Gift Modals =====
function editGift(id, name, qty, weight, color, order, active, image) {
  document.getElementById('giftModalTitle').textContent = '✏️ Sửa quà';
  document.getElementById('editGiftForm').action = '/admin/gift/' + id;
  document.getElementById('giftName').value = name;
  document.getElementById('giftQty').value = qty;
  document.getElementById('giftWeight').value = weight;
  document.getElementById('giftColor').value = color || '#fcd3de';
  document.getElementById('giftOrder').value = order || 0;
  document.getElementById('giftActive').checked = active == 1;
  openModal('editGiftModal');
}

function openAddGift() {
  document.getElementById('giftModalTitle').textContent = '+ Thêm quà mới';
  document.getElementById('editGiftForm').action = '/admin/gift/add';
  document.getElementById('editGiftForm').reset();
  document.getElementById('giftActive').checked = true;
  openModal('editGiftModal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// Copy personal user link helper
function copyUserLink(ldap, name) {
  const link = window.location.origin + '/' + ldap;
  navigator.clipboard.writeText(link).then(() => {
    showAdminToast('✓ Đã copy link của ' + name + ':\\n' + link);
  }).catch(() => {
    prompt('Link cá nhân của ' + name + ':', link);
  });
}

function showAdminToast(msg) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}
</script>
<div id="adminToast"></div>
</body>
</html>`;
}

function escapeJs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

module.exports = router;
