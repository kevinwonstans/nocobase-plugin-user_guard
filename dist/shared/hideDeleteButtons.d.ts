/**
 * 默认用户管理页删除按钮隐藏（v1/v2 共用）
 *
 * 背景：plugin-users 的原生用户页（v1 硬编码 schema / v2 硬编码 React 组件）无法从
 * 外部注入列或按钮，删除按钮也无法通过 ACL 可见性隐藏（客户端列表请求不带
 * X-With-ACL-Meta 头，allowedActions 机制不生效）。
 *
 * 方案：全局 DOM 观察器——当路径命中「用户与权限 → 用户」页时，隐藏所有文本为
 * 「删除」的按钮（行内删除 + 工具栏批量删除）；离开该页时恢复显示。
 * 删除操作统一收敛到本插件的「用户登录控制」管理页（密码二次验证）。
 */
export declare function installUserPageDeleteButtonHider(): () => void;
