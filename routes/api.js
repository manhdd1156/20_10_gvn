const express = require('express');
const router = express.Router();
const db = require('../database');

// Validate LDAP login
router.post('/login', (req, res) => {
  const { ldap } = req.body;
  if (!ldap) return res.json({ success: false, message: 'Vui lòng nhập LDAP' });

  const user = db.getUserByLdap(ldap);
  if (!user) {
    return res.json({ success: false, message: 'LDAP không tồn tại trong danh sách. Vui lòng kiểm tra lại!' });
  }

  req.session.ldap = user.ldap;
  res.json({ success: true, ldap: user.ldap });
});

// Get user info
router.get('/user/:ldap', (req, res) => {
  const user = db.getUserByLdap(req.params.ldap);
  if (!user) return res.status(404).json({ error: 'Not found' });

  let giftInfo = null;
  if (user.gift_id) {
    giftInfo = db.getGiftById(user.gift_id);
  }

  res.json({
    ldap: user.ldap,
    display_name: user.display_name,
    wish: user.wish,
    avatar: user.avatar,
    spun: user.spun === 1,
    gift: giftInfo ? { id: giftInfo.id, name: giftInfo.name, image: giftInfo.image, color: giftInfo.color } : null
  });
});

// Get wheel gifts (active only)
router.get('/gifts', (req, res) => {
  const gifts = db.getActiveGifts();
  res.json(gifts);
});

// Get all users summary (for heart loading collage)
router.get('/users-summary', (req, res) => {
  const users = db.getUsers().map(u => ({
    ldap: u.ldap,
    display_name: u.display_name,
    avatar: u.avatar || ''
  }));
  res.json(users);
});

// Danh sách quà chỉ định trực tiếp cho người cố định
const DESIGNATED_GIFTS = {
  'ntdung36': 4,  // Găng tay tẩy tế bào
  'tkhuyen': 5,   // Phấn má hồng
  'dklinh': 10    // Mascara Browit
};

// Spin the wheel
router.post('/spin', (req, res, next) => {
  try {
    const { ldap } = req.body;
    if (!ldap) return res.status(400).json({ error: 'Missing LDAP' });

    const user = db.getUserByLdap(ldap);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.spun) {
      const gift = db.getGiftById(user.gift_id);
      return res.json({ success: false, already_spun: true, gift });
    }

    const userLdapClean = user.ldap.toLowerCase().trim();
    let selectedGift = null;

    // 1. Kiểm tra nếu user nằm trong danh sách chỉ định trực tiếp
    if (DESIGNATED_GIFTS[userLdapClean]) {
      const designatedGiftId = DESIGNATED_GIFTS[userLdapClean];
      const targetGift = db.getGiftById(designatedGiftId);
      if (targetGift && (targetGift.remaining || 0) > 0) {
        selectedGift = targetGift;
      }
    }

    // 2. Nếu không thuộc danh sách chỉ định: chọn ngẫu nhiên theo số lượng còn lại
    if (!selectedGift) {
      // Loại bỏ các món quà đã được chỉ định (id 4, 5, 10) để bảo vệ quà riêng
      const designatedGiftIds = Object.values(DESIGNATED_GIFTS);
      const poolGifts = db.getActiveGifts().filter(g => 
        !designatedGiftIds.includes(Number(g.id)) && (g.remaining || 0) > 0
      );

      if (poolGifts.length === 0) {
        return res.json({ success: false, message: 'Hiện tại đã hết quà trong kho!' });
      }

      // Chia đều tỉ lệ theo số lượng quà còn lại (remaining)
      const totalRemaining = poolGifts.reduce((sum, g) => sum + (Number(g.remaining) || 0), 0);
      let rand = Math.random() * totalRemaining;
      selectedGift = poolGifts[poolGifts.length - 1];

      for (const gift of poolGifts) {
        rand -= (Number(gift.remaining) || 0);
        if (rand <= 0) {
          selectedGift = gift;
          break;
        }
      }
    }

    if (!selectedGift) {
      return res.json({ success: false, message: 'Hiện tại đã hết quà trong kho!' });
    }

    // Save result
    const now = new Date().toISOString();
    db.updateUser(user.ldap, {
      spun: 1,
      gift_id: selectedGift.id,
      spun_at: now
    });

    const newRemaining = Math.max(0, (selectedGift.remaining || 1) - 1);
    db.updateGift(selectedGift.id, {
      remaining: newRemaining
    });

    res.json({ success: true, gift: selectedGift });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
