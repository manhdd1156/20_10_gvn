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

// Spin the wheel
router.post('/spin', (req, res) => {
  const { ldap } = req.body;
  if (!ldap) return res.status(400).json({ error: 'Missing LDAP' });

  const user = db.getUserByLdap(ldap);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.spun) {
    const gift = db.getGiftById(user.gift_id);
    return res.json({ success: false, already_spun: true, gift });
  }

  // Get active gifts with remaining > 0
  const gifts = db.getActiveGifts().filter(g => (g.remaining || 0) > 0);
  if (gifts.length === 0) {
    return res.json({ success: false, message: 'Hiện tại đã hết quà trong kho!' });
  }

  // Weighted random selection
  const totalWeight = gifts.reduce((sum, g) => sum + (Number(g.weight) || 1), 0);
  let rand = Math.random() * totalWeight;
  let selectedGift = gifts[gifts.length - 1];
  for (const gift of gifts) {
    rand -= (Number(gift.weight) || 1);
    if (rand <= 0) {
      selectedGift = gift;
      break;
    }
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
});

module.exports = router;
