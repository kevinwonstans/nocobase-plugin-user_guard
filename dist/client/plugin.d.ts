import { Plugin } from '@nocobase/client';
/**
 * v1 客户端（/admin/）用户登录控制插件
 *
 * - 安装会话守卫拦截器：禁用用户的 401（USER_DISABLED）→ 清本地认证状态并跳转登录页；
 *   登录被拒时 6 秒倒计时后自动退出（登录页内置错误提示保留，不重复弹框）
 * - 隐藏默认用户管理页的删除按钮（删除统一走密码二次验证）
 * - 在「用户与权限」下注册「用户登录控制」管理页
 */
export declare class PluginUserGuardClient extends Plugin {
    load(): Promise<void>;
}
export default PluginUserGuardClient;
