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
    /**
     * 钉钉 OAuth 回调路径修正（v2 专用）
     *
     * 第三方钉钉插件（nocobase-plugin-dingtalk）的 redirectAuth 把 token 重定向回
     * 根路径（APP_PUBLIC_PATH || "/"），导致 v2 入口发起的登录在回调后落入 v1 应用，
     * 被拒时用户被困在 v1 登录页。
     *
     * 修复：拦截 getAuthUrl 响应（钉钉授权 URL），当其 redirect_uri 的 redirect 参数
     * 为空时补 "/v/" 标记 —— 回调将重定向到 /v/（v2 应用），由 v2 插件的会话守卫
     * 处理（提示 + 整页跳转回 /v/signin）。
     */
    private patchDingTalkOAuthRedirect;
}
export default PluginUserGuardClientV2;
