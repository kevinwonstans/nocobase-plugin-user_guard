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

import { notification } from 'antd';
import {
  LOGOUT_COUNTDOWN_SECONDS,
  USER_DISABLED_CODE,
} from './constants';

interface UserGuardAppLike {
  apiClient: {
    axios: {
      interceptors: {
        response: {
          use: (
            onFulfilled: any,
            onRejected: any,
            options?: { unshift?: boolean },
          ) => void;
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

/** OAuth 回调携带的登录后目标（若以 /v/ 开头则跳回 v2 登录页） */
let oauthRedirectTarget: string | null = null;

/** 跳转登录页（保留 redirect 参数），已在登录页则跳过 */
function redirectToSignin(app: UserGuardAppLike, replace = false) {
  const router = app.router;
  const { pathname, search } = getLocation(app);
  // 已在登录页（路径以 /signin 结尾，兼容 v1 /signin 与 v2 /v/signin）则跳过
  if (pathname.endsWith('/signin') || pathname.endsWith('/signin/')) {
    return;
  }
  // OAuth 回调携带的 redirect 目标：以 /v/ 开头 → 回 v2 登录页（用户从 v2 入口发起）
  if (oauthRedirectTarget) {
    const target = oauthRedirectTarget.startsWith('/v/') ? '/v/signin' : '/signin';
    window.location.href = `${target}?redirect=${encodeURIComponent(oauthRedirectTarget)}`;
    return;
  }
  const basename = router?.basename ?? '/admin';
  const rawPath = pathname.startsWith(basename) ? pathname.slice(basename.length) : pathname;
  const redirect = encodeURIComponent(`${rawPath.startsWith('/') ? rawPath : `/${rawPath}` || '/'}${search}`);
  // v2 客户端运行在 /v/ 前缀下，登录页为 /v/signin；v1 为 /signin
  const isV2 = window.location.pathname.startsWith('/v/');
  const signinPath = isV2 ? '/v/signin' : '/signin';
  const signinUrl = `${signinPath}?redirect=${redirect}`;
  // 一律整页跳转（刷新兜底）：SPA 启动早期（如钉钉 OAuth 回调后 auth:check 立即
  // 401）应用初始化可能卡住，router.navigate 会静默失败 —— 整页跳转可重新干净加载登录页
  window.location.href = signinUrl;
}

export function installUserGuardSessionInterceptor(app: UserGuardAppLike) {
  const apiClient = app.apiClient;
  if (!apiClient?.axios) {
    return;
  }
  let countdownTimer: ReturnType<typeof setTimeout> | null = null;
  let notified = false;

  const onFulfilled = (response: any) => response;
  const onRejected = (error: any) => {
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

    // 会话即时失效：弹一次提示 + 清本地状态，短暂延迟后整页跳转登录页
    // （延迟保证提示可见；整页跳转重新干净加载登录页，避免初始化卡住）
    if (!notified) {
      notified = true;
      notification.error({ message: first.message, placement: 'topRight' });
    }
    // 阻止后续拦截器（内置错误通知）重复弹提示
    if (error.config) {
      error.config.skipNotify = true;
    }
    apiClient.auth.setToken(null);
    apiClient.auth.setRole(null);
    apiClient.auth.setAuthenticator(null);
    setTimeout(() => redirectToSignin(app, false), 1500);
    // 注意：不能吞错（永不 settle 的 Promise）——否则 auth:check 等初始化请求
    // 会永久挂起，v1 应用初始化卡在 Loading 页（钉钉回调场景的空白页）。
    // reject 后由应用自身的认证流程继续（跳转登录页）。
    return Promise.reject(error);
  };

  // 注意：axios 1.x（本项目 1.19）的 use() 第三参数仅支持 synchronous/runWhen，
  // 不支持 unshift 选项 —— 直接追加会在内置通知拦截器之后执行（内置先弹提示，
  // 我们再弹 → 出现 2 个提示框）。因此手动把处理器插入 handlers 最前。
  apiClient.axios.interceptors.response.use(onFulfilled, onRejected);
  const handlers = apiClient.axios.interceptors.response.handlers;
  if (Array.isArray(handlers) && handlers.length) {
    const handler = handlers.pop();
    handlers.unshift(handler);
  }
}

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
export function proactivelyVerifyOAuthCallbackToken(app: any) {
  const apiClient = app?.apiClient;
  if (!apiClient?.auth) {
    return;
  }
  let token: string | null = null;
  let authenticator: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    token = params.get('token');
    authenticator = params.get('authenticator');
  } catch {
    return;
  }
  if (!token) {
    return;
  }
  // 写入 auth（幂等：若应用初始化已消费，则直接复用现有 token）
  if (!apiClient.auth.getToken()) {
    apiClient.auth.setToken(token);
  }
  if (authenticator && !apiClient.auth.getAuthenticator()) {
    apiClient.auth.setAuthenticator(authenticator);
  }
  // 主动验证：401（USER_DISABLED）由会话守卫拦截器处理；其它错误忽略
  apiClient
    .resource('auth')
    .check()
    .catch(() => {});
}
