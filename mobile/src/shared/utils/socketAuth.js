/** Socket 回调里服务端返回的常见未登录文案 */
export function isUnauthenticatedSocketMessage(message) {
  return /请先登录|未登录|认证失败|请先登陆/i.test(String(message || ''))
}
