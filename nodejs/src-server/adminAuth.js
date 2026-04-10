/**
 * 管理端鉴权中间件：要求已登录 + 命中 ADMIN_IDS 白名单
 */

const { authMiddleware } = require('./auth');

function parseAdminIds() {
  return (process.env.ADMIN_IDS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function adminOnly(req, res, next) {
  // 兼容现有项目：默认关闭强制鉴权，开启后才执行白名单验证。
  if (process.env.ADMIN_AUTH_ENABLED !== 'true') {
    return next();
  }

  const adminIds = parseAdminIds();
  if (!adminIds.length) {
    return res.status(403).json({
      success: false,
      message: '管理员白名单未配置',
    });
  }

  if (!req.user?.userId || !adminIds.includes(String(req.user.userId))) {
    return res.status(403).json({
      success: false,
      message: '无权限访问管理接口',
    });
  }

  return next();
}

const adminAuthMiddleware = [authMiddleware, adminOnly];

module.exports = { adminOnly, adminAuthMiddleware };
