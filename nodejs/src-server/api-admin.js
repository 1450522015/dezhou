const express = require('express');
const adminService = require('./services/admin-service');

const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const result = await adminService.listUsers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/users/online', async (req, res) => {
  try {
    const onlineCount = await adminService.getOnlineCount(req.app.get('lobby'));
    res.json({ success: true, onlineCount });
  } catch (err) {
    console.error('Admin online count error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/users/:id/password', async (req, res) => {
  try {
    const r = await adminService.updateUserPassword(req.params.id, req.body?.password);
    if (!r.ok) return res.status(r.code).json({ success: false, message: r.message });
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('Admin update password error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/users/count', async (_req, res) => {
  try {
    const totalUsers = await adminService.countUsers();
    res.json({ success: true, totalUsers });
  } catch (err) {
    console.error('Admin user count error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const rooms = adminService.listRooms(req.app.get('game'));
    res.json({ success: true, rooms });
  } catch (err) {
    console.error('Admin rooms error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    adminService.closeRoom(req.app.get('game'), req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin close room error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/records', async (req, res) => {
  try {
    const result = await adminService.listRecords(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Admin records error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await adminService.getStats({
      lobby: req.app.get('lobby'),
      gameManager: req.app.get('game'),
    });
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router };
