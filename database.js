const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

const defaultData = {
  users: [
    { id: 1, ldap: 'dlphuong1', display_name: 'Lan Phương', wish: 'Anh em GVN chúc chị Phương 20/10 thật vui bên gia đình ạ\nChúc chị lên GLead dẫn team thắng lớn, tiền tài danh vọng đều lên theo nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 2, ldap: 'mkly', display_name: 'Khánh Ly', wish: '20/10, anh em GVN chúc chị Ly được cả nhà chiều chuộng, ồ ạt quà tặng ạ\nChúc chị vượt số anh Hưng giao nha ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 3, ldap: 'nttan3', display_name: 'Thu An', wish: 'Anh em GVN chúc chị An 20/10 nhận được quà mình thích, có một ngày thật vui ạ.\nChúc chị luôn khỏe, có nhiều thời gian cho bản thân và làm được những điều mình muốn ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 4, ldap: 'npthanh', display_name: 'Phương Thanh', wish: 'Anh em GVN chúc chị Thanh 20/10 thật vui bên gia đình ạ.\nChúc chị ngày càng được chồng chiều, ngày thường cũng vui như ngày lễ nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 5, ldap: 'ntmanh2', display_name: 'Mai Anh', wish: '20/10, anh em GVN chúc chị Mai Anh nhận đúng món quà mình thích, có một ngày thật vui ạ.\nChúc chị sớm có người thương thật hợp ý, anh em GVN đang chờ nhận thiệp rùi ạ!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 6, ldap: 'ttnchau', display_name: 'Ngọc Châu', wish: '20/10, anh em GVN chúc em Châu nhiều quà, nhiều tiếng cười nhé.\nChúc em chốt số đều tay, số về ồ ạt nha!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 7, ldap: 'nbkhanh6', display_name: 'Bảo Khánh', wish: 'Anh em GVN chúc em Khánh 20/10 nhận được món quà mình thích, có một ngày thật vui nhé.\nChúc em ngày nào cũng có chuyện vui để kể, năm nay nổ số thật to nha!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 8, ldap: 'tttdieu1', display_name: 'Thúy Diệu', wish: 'Anh em GVN chúc chị Diệu 20/10 thật vui bên gia đình ạ.\nChúc chị luôn khỏe, nhiều năng lượng để dẫn dắt đàn em thơ team LEB ngày càng cứng cáp nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 9, ldap: 'tkhuyen', display_name: 'Khánh Huyền', wish: 'Anh em GVN chúc chị Huyền 20/10 thật vui, quà nhận đầy tay ạ.\nChúc chị có nhiều niềm vui trong cuộc sống và làm được nhiều điều mình muốn hơn ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 10, ldap: 'ldyduyen', display_name: 'Yến Duyên', wish: '20/10, anh em GVN chúc chị Duyên nhận được món quà mình thích ạ\nChúc chị có nhiều sức khỏe và nhiều niềm vui hơn trong cuộc sống ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 11, ldap: 'lpthao12', display_name: 'Phương Thảo Lê', wish: 'Anh em GVN chúc em Thảo Lê 20/10 thật vui, nhận nhiều quà nhé.\nChúc em có thật nhiều niềm vui và sớm báo tin để anh em GVN còn lên đồ đi ăn tiệc nha!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 12, ldap: 'ttpthao6', display_name: 'Phương Thảo Tiêu', wish: 'Anh em GVN chúc em Thảo Tiêu 20/10 thật vui, luôn khỏe và nhiều năng lượng nhé.', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 13, ldap: 'ttchinh1', display_name: 'Chinh Trần', wish: 'Anh em GVN chúc chị Chinh 20/10 thật vui, luôn khỏe và được cả nhà chiều chuộng ạ.\nChúc chị có thêm thời gian làm những điều mình thích, ngày nào cũng có một chuyện vui nho nhỏ nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 14, ldap: 'dlnhi', display_name: 'Linh Nhi', wish: 'Anh em GVN chúc chị Nhi 20/10 thật vui, quà nhận đầy tay ạ.\nChúc chị công việc thuận lợi, sớm đạt được những mục tiêu mình đặt ra ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 15, ldap: 'nqchi4', display_name: 'Quỳnh Chi', wish: '20/10, anh em GVN chúc chị Chi một ngày thật tưng bừng, nhiều quà, nhiều tiếng cười ạ.\nChúc chị luôn khỏe, luôn vui, tài khoản tăng đều để thích gì cũng có thể tự thưởng nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 16, ldap: 'dklinh', display_name: 'Kaity', wish: 'anh em GVN chúc chị Kaity có một dịp 20/10 vui vẻ cùng gia đình ạ\nchúc chị có nhiều sức khỏe và nhiều niềm vui trong cuộc sống ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 17, ldap: 'dhvan6', display_name: 'Cristy', wish: 'anh em GVN chúc chị Cristy có một dịp 20/10 vui vẻ nhiều sức khỏe ạ\nchúc chị cùng chồng sắp cưới trăm năm hạnh phúc nha ạ', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 18, ldap: 'pnanh8', display_name: 'Ngọc Anh', wish: 'Anh em GVN chúc chị Anna 20/10 thật vui bên gia đình ạ.\nChúc chị luôn khỏe, trình pickleball lên đều để ra sân là anh em tranh nhau xin cùng đội nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 19, ldap: 'dthvan', display_name: 'Hanna', wish: 'Anh em GVN chúc chị Hanna 20/10 thật vui bên gia đình ạ.\nChúc chị luôn khỏe mạnh, giữ đều lịch ra sân đánh pick cùng mọi người nha ạ!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 20, ldap: 'vtthien5', display_name: 'Thu Hiền - ngài đại sứ', wish: 'Anh em GVN chúc chị Hiền 20/10 thật vui bên gia đình ạ.\nChúc Đại sứ Văn hóa luôn khỏe, đầy năng lượng, lên kèo nào là anh em hưởng ứng nhiệt tình kèo đó nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 21, ldap: 'gmhanh', display_name: 'Mỹ Hạnh', wish: 'Anh em GVN chúc chị Hạnh 20/10 thật vui, nhận quà mỏi tay ạ.\nChúc chị sớm thành cao thủ pickleball, ra sân đánh hay, đi giải có cúp mang về nha chị!', avatar: '', spun: 0, gift_id: null, spun_at: null },
    { id: 22, ldap: 'ntdung36', display_name: 'Dung Nguyễn', wish: 'Anh em GVN chúc chị Dung 20/10 thật vui, luôn khỏe và nhận được món quà mình thích ạ.\nChúc chị sớm đạt được những điều mình mong muốn nha ạ', avatar: '/uploads/avatars/ntdung36.jpg', spun: 0, gift_id: null, spun_at: null },
    { id: 23, ldap: 'nhlinh7', display_name: 'Hà Linh', wish: 'Anh em GVN chúc Hà Linh 20/10 thật vui tươi, xinh đẹp, luôn may mắn và nhận được món quà mình yêu thích nhé!', avatar: './uploads/avatars/nhlinh7.jpg', spun: 0, gift_id: null, spun_at: null }
  ],
  gifts: [
    { id: 1, name: 'Kem tay thơm - hoa cam cỏ', quantity: 3, remaining: 3, weight: 3, color: '#fcd3de', sort_order: 1, active: 1, image: './uploads/gifts/1.jpg' },
    { id: 2, name: 'Kem tay thơm - bơ hạt mỡ', quantity: 2, remaining: 2, weight: 2, color: '#fbe2d5', sort_order: 2, active: 1, image: './uploads/gifts/2.jpg' },
    { id: 3, name: 'Kem tay thơm - hoa anh đào', quantity: 2, remaining: 2, weight: 2, color: '#e4d3ec', sort_order: 3, active: 1, image: './uploads/gifts/3.jpg' },
    { id: 4, name: 'Găng tay tẩy tế bào', quantity: 1, remaining: 1, weight: 0, color: '#fcd3de', sort_order: 4, active: 1, image: './uploads/gifts/4.jpg' },
    { id: 5, name: 'Phấn má hồng', quantity: 1, remaining: 1, weight: 0, color: '#fbe2d5', sort_order: 5, active: 1, image: './uploads/gifts/5.jpg' },
    { id: 6, name: 'Mặt nạ dừa tươi', quantity: 3, remaining: 3, weight: 3, color: '#fcd0df', sort_order: 6, active: 1, image: './uploads/gifts/6.jpg' },
    { id: 7, name: 'Sửa rửa mặt tạo bọt', quantity: 5, remaining: 5, weight: 5, color: '#fce3d7', sort_order: 7, active: 1, image: './uploads/gifts/7.jpg' },
    { id: 8, name: 'Mặt nạ dừa tươi - da dầu', quantity: 5, remaining: 5, weight: 5, color: '#e6d8ed', sort_order: 8, active: 1, image: './uploads/gifts/8.jpg' },
    { id: 9, name: 'Mặt nạ dừa tươi - dưỡng ẩm', quantity: 3, remaining: 3, weight: 3, color: '#fcd3de', sort_order: 9, active: 1, image: './uploads/gifts/9.jpg' },
    { id: 10, name: 'Mascara Browit', quantity: 2, remaining: 2, weight: 1, color: '#fce3d7', sort_order: 10, active: 1, image: './uploads/gifts/10.jpg' }
  ]
};

function loadData() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveData(defaultData);
      return JSON.parse(JSON.stringify(defaultData));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Lỗi đọc database json:', err);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi ghi database json:', err);
  }
}

// Helper methods mimicking simple db queries
const db = {
  getUsers() {
    return loadData().users;
  },
  getUserByLdap(ldap) {
    if (!ldap) return null;
    const users = this.getUsers();
    return users.find(u => u.ldap.toLowerCase().trim() === ldap.toLowerCase().trim()) || null;
  },
  updateUser(ldap, updateFields) {
    const data = loadData();
    const index = data.users.findIndex(u => u.ldap.toLowerCase().trim() === ldap.toLowerCase().trim());
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...updateFields };
      saveData(data);
      return data.users[index];
    }
    return null;
  },
  getGifts() {
    return loadData().gifts;
  },
  getActiveGifts() {
    const gifts = this.getGifts();
    return gifts.filter(g => g.active === 1).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },
  getGiftById(id) {
    const gifts = this.getGifts();
    return gifts.find(g => Number(g.id) === Number(id)) || null;
  },
  addGift(giftData) {
    const data = loadData();
    const newId = data.gifts.length > 0 ? Math.max(...data.gifts.map(g => g.id)) + 1 : 1;
    const gift = { id: newId, ...giftData };
    data.gifts.push(gift);
    saveData(data);
    return gift;
  },
  updateGift(id, updateFields) {
    const data = loadData();
    const index = data.gifts.findIndex(g => Number(g.id) === Number(id));
    if (index !== -1) {
      data.gifts[index] = { ...data.gifts[index], ...updateFields };
      saveData(data);
      return data.gifts[index];
    }
    return null;
  },
  deleteGift(id) {
    const data = loadData();
    data.gifts = data.gifts.filter(g => Number(g.id) !== Number(id));
    saveData(data);
  }
};

// Khởi tạo file data.json nếu chưa có
loadData();

module.exports = db;
