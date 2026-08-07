/**
 * 会话守卫（v1/v2 共用）
 *
 * 处理两类 401（code: USER_DISABLED，由服务端 user_guard 中间件产生）：
 * 1. auth:signIn 被拒（禁用用户登录）：不吞错误，让登录页内置错误提示正常展示；
 *    同时启动 6 秒倒计时，到点后清空本地认证状态（自动退出登录）
 * 2. 会话中被踢（禁用用户的已登录会话发起的任意请求，如钉钉 OAuth 回调后的
 *    auth:check）：立即清空本地认证状态、弹一次提示（antd notification）并跳转
 *    登录页；吞掉错误（永不 settle 的 Promise），避免内置通知刷屏
 *
 * 注：auth:signOut 请求服务端已豁免状态检查，因此禁用用户点击"注销"可正常
 * 完成（返回 200，SDK 正常清理本地状态）——这是对"signOut 401 卡死"根因的修复。
 */
interface UserGuardAppLike {
    apiClient: {
        axios: {
            interceptors: {
                response: {
                    use: (onFulfilled: any, onRejected: any, options?: {
                        unshift?: boolean;
                    }) => void;
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
/**
 * 钉钉等 OAuth 回调 token 的主动验证（v1/v2 插件 load 时调用）
 *
 * 背景：OAuth 登录（如钉钉）回调后，服务端把 token 通过 URL 参数重定向回前端
 * （/?authenticator=dingtalk&token=xxx）。被禁用用户拿到 token 后，应用初始化
 * 的 auth:check 会收到 401（USER_DISABLED）——但该请求可能早于本插件拦截器的
 * 注册时机（v1 应用初始化早期），导致 401 未被处理、初始化卡在 Loading 页。
 *
 * 方案：插件 load() 时若发现 URL 携带 token 参数（OAuth 回调场景），主动把 token
 * 写入 auth 并发起一次 auth:check 验证——401（USER_DISABLED）时由会话守卫拦截器
 * （此时已注册）弹提示并整页跳转登录页（刷新兜底）；用户正常时不做任何干预。
 */
export declare function proactivelyVerifyOAuthCallbackToken(app: any): void;
export {};
