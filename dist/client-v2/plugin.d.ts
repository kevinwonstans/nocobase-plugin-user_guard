import { Application, Plugin } from '@nocobase/client-v2';
/**
 * v2 客户端（/v/admin/）用户登录控制插件
 *
 * - 安装会话守卫拦截器（与 v1 同一实现）
 * - 主动验证 OAuth 回调 token（钉钉登录被拒时避免应用初始化卡住）
 * - 隐藏默认用户管理页的删除按钮（删除统一走密码二次验证）
 * - 在「用户与权限」设置菜单下注册「用户登录控制」页签
 */
export declare class PluginUserGuardClientV2 extends Plugin<any, Application> {
    load(): Promise<void>;
}
export default PluginUserGuardClientV2;
