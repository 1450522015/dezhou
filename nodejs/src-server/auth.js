/**
 * 认证模块：JWT + 用户注册/登录
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { UserModel, toPublicUser } = require('./models');

const router = express.Router();

/**
 * 用户名校验：1-20位，不允许空白字符和危险字符
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 1 || username.length > 20) return false;
  if (/\s/.test(username)) return false;
  // 禁止危险字符
  if (/[<>\"'&\\\/]/.test(username)) return false;
  return true;
}

/**
 * 密码格式校验：无非法字符即可
 * 非法字符：空格、制表符、换行等空白字符
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  // 不允许空白字符
  return !/\s/.test(password);
}

/**
 * 生成 JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), username: user.username },
    config.JWT.secret,
    { expiresIn: config.JWT.expiresIn }
  );
}

/**
 * JWT 中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.JWT.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }
}

/**
 * POST /api/auth/register - 注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname, gender } = req.body;

    if (!validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: '用户名格式错误：1-20位，不含空格或特殊字符'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: '密码不能包含空白字符'
      });
    }

    const existing = await UserModel.findByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserModel.create(username, passwordHash, { nickname, gender });
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/auth/login - 登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await UserModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/auth/me - 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/auth/profile - 更新用户资料（昵称、性别）
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, gender } = req.body;
    const body = {};
    if (nickname !== undefined) body.nickname = nickname;
    if (gender !== undefined) body.gender = gender;

    const r = await UserModel.updateV3Profile(req.user.userId, body);
    if (!r.ok) {
      return res.status(400).json({ success: false, message: r.message });
    }
    res.json({ success: true, user: r.user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router, authMiddleware };
