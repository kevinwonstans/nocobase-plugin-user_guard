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

import {
  LOGOUT_COUNTDOWN_SECONDS,
  USER_DISABLED_CODE,
} from './constants';

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
    navigate?: (path: string, options?: { replace?: boolean }) => void;
    router?: {
      state?: { location?: { pathname?: string; search?: string } };
    };
  };
}

function getLocation(app: UserGuardAppLike): { pathname: string; search: string } {
  const loc = app.router?.router?.state?.location;
  const pathname = loc?.pathname ?? window.location.pathname ?? '';
  const search = loc?.search ?? window.location.search ?? '';
  return { pathname, search };
}

/** 跳转登录页（保留 redirect 参数），已在登录页则跳过 */
function redirectToSignin(app: UserGuardAppLike, replace = false) {
  const router = app.router;
  const { pathname, search } = getLocation(app);
  // 已在登录页（路径以 /signin 结尾，兼容 v1 /signin 与 v2 /v/signin）则跳过
  if (pathname.endsWith('/signin') || pathname.endsWith('/signin/')) {
    return;
  }
  const basename = router?.basename ?? '/admin';
  const rawPath = pathname.startsWith(basename) ? pathname.slice(basename.length) : pathname;
  const redirect = encodeURIComponent(`${rawPath.startsWith('/') ? rawPath : `/${rawPath}` || '/'}${search}`);
  router?.navigate?.(`/signin?redirect=${redirect}`, { replace });
}

export function installUserGuardSessionInterceptor(app: UserGuardAppLike) {
  const apiClient = app.apiClient;
  if (!apiClient?.axios) {
    return;
  }
  let countdownTimer: ReturnType<typeof setTimeout> | null = null;

  apiClient.axios.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      const response = error?.response;
      if (response?.status !== 401) {
        return Promise.reject(error);
      }
      const errors = response?.data?.errors;
      const first = Array.isArray(errors) ? errors[0] : null;
      if (!first || first.code !== USER_DISABLED_CODE) {
        return Promise.reject(error);
      }
      const requestUrl = error?.config?.url ?? '';
      const isSignInRequest = String(requestUrl).includes('auth:signIn');

      if (isSignInRequest) {
        // 登录被拒：保留登录页内置错误提示，倒计时结束后自动退出登录
        if (!countdownTimer) {
          countdownTimer = setTimeout(() => {
            countdownTimer = null;
            apiClient.auth.setToken(null);
            apiClient.auth.setRole(null);
            apiClient.auth.setAuthenticator(null);
            redirectToSignin(app, true);
          }, LOGOUT_COUNTDOWN_SECONDS * 1000);
        }
        // 不吞错：让内置错误提示（v1 通知 / v2 表单 Alert）正常展示
        return Promise.reject(error);
      }

      // 会话即时失效：清本地状态并跳转登录页
      apiClient.auth.setToken(null);
      apiClient.auth.setRole(null);
      apiClient.auth.setAuthenticator(null);
      redirectToSignin(app, false);
      // 永不 settle：阻断后续拦截器（内置错误通知）执行，避免重复弹提示
      return new Promise(() => {});
    },
  );
}
