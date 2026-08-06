import { Plugin } from '@nocobase/server';
/**
 * 用户登录控制（user-guard）服务端插件
 *
 * 核心能力：
 * 1. users.status 字段迁移（幂等，缺列则补，并回填 active）
 * 2. 登录拦截：auth:signIn 成功响应中 user.status === 'disabled' 时，
 *    改写为 401（code: USER_DISABLED）并黑名单刚签发的 token
 * 3. 请求级状态检查：已登录且被禁用的用户，除 auth:signOut 外一律 401（会话即时失效）
 * 4. 删除二次验证：users:destroy 必须携带当前登录用户密码，缺失/错误一律拒绝
 * 5. userGuard:disable / userGuard:enable 自定义 API，保护 root(id=1) 与当前登录用户
 */
export declare class PluginUserGuardServer extends Plugin {
    load(): Promise<void>;
    /** 禁用/启用共用逻辑（含保护规则） */
    private setStatus;
}
export default PluginUserGuardServer;
