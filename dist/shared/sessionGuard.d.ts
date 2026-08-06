/**
 * 会话守卫（v1/v2 共用）
 *
 * 处理两类 401（code: USER_DISABLED，由服务端 user_guard 中间件产生）：
 * 1. auth:signIn 被拒（禁用用户登录）：不吞错误，让登录页内置错误提示正常展示；
 *    同时启动 6 秒倒计时，到点后清空本地认证状态（自动退出登录）
 * 2. 会话中被踢（禁用用户的已登录会话发起的任意请求）：立即清空本地认证状态
 *    并跳转登录页；吞掉错误（永不 settle 的 Promise），避免内置错误通知刷屏
 *
 * 注：auth:signOut 请求服务端已豁免状态检查，因此禁用用户点击"注销"可正常
 * 完成（返回 200，SDK 正常清理本地状态）——这是对"signOut 401 卡死"根因的修复。
 */
interface UserGuardAppLike {
    apiClient: {
        axios: {
            interceptors: {
                response: {
                    use: (onFulfilled: any, onRejected: any, options?: any) => void;
                };
            };
        };
        auth: {
            setToken: (token: string | null) => void;
            setRole: (role: string | null) => void;
            setAuthenticator: (name: string | null) => void;
        };
    };
    router?: {
        basename?: string;
        navigate?: (path: string, options?: {
            replace?: boolean;
        }) => void;
        router?: {
            state?: {
                location?: {
                    pathname?: string;
                    search?: string;
                };
            };
        };
    };
}
export declare function installUserGuardSessionInterceptor(app: UserGuardAppLike): void;
export {};
