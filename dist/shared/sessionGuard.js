/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sessionGuard_exports = {};
__export(sessionGuard_exports, {
  installUserGuardSessionInterceptor: () => installUserGuardSessionInterceptor,
  proactivelyVerifyOAuthCallbackToken: () => proactivelyVerifyOAuthCallbackToken
});
module.exports = __toCommonJS(sessionGuard_exports);
var import_antd = require("antd");
var import_constants = require("./constants");
function getLocation(app) {
  var _a, _b, _c;
  const loc = (_c = (_b = (_a = app.router) == null ? void 0 : _a.router) == null ? void 0 : _b.state) == null ? void 0 : _c.location;
  const pathname = (loc == null ? void 0 : loc.pathname) ?? window.location.pathname ?? "";
  const search = (loc == null ? void 0 : loc.search) ?? window.location.search ?? "";
  return { pathname, search };
}
function redirectToSignin(app, replace = false) {
  const router = app.router;
  const { pathname, search } = getLocation(app);
  if (pathname.endsWith("/signin") || pathname.endsWith("/signin/")) {
    return;
  }
  const basename = (router == null ? void 0 : router.basename) ?? "/admin";
  const rawPath = pathname.startsWith(basename) ? pathname.slice(basename.length) : pathname;
  const redirect = encodeURIComponent(`${rawPath.startsWith("/") ? rawPath : `/${rawPath}` || "/"}${search}`);
  const isV2 = window.location.pathname.startsWith("/v/");
  const signinPath = isV2 ? "/v/signin" : "/signin";
  const signinUrl = `${signinPath}?redirect=${redirect}`;
  window.location.href = signinUrl;
}
function installUserGuardSessionInterceptor(app) {
  const apiClient = app.apiClient;
  if (!(apiClient == null ? void 0 : apiClient.axios)) {
    return;
  }
  let countdownTimer = null;
  let notified = false;
  apiClient.axios.interceptors.response.use(
    (response) => response,
    (error) => {
      var _a, _b;
      const response = error == null ? void 0 : error.response;
      if ((response == null ? void 0 : response.status) !== 401) {
        return Promise.reject(error);
      }
      const errors = (_a = response == null ? void 0 : response.data) == null ? void 0 : _a.errors;
      const first = Array.isArray(errors) ? errors[0] : null;
      if (!first || first.code !== import_constants.USER_DISABLED_CODE) {
        return Promise.reject(error);
      }
      const requestUrl = ((_b = error == null ? void 0 : error.config) == null ? void 0 : _b.url) ?? "";
      const isSignInRequest = String(requestUrl).includes("auth:signIn");
      if (isSignInRequest) {
        if (!countdownTimer) {
          countdownTimer = setTimeout(() => {
            countdownTimer = null;
            apiClient.auth.setToken(null);
            apiClient.auth.setRole(null);
            apiClient.auth.setAuthenticator(null);
            redirectToSignin(app, true);
          }, import_constants.LOGOUT_COUNTDOWN_SECONDS * 1e3);
        }
        return Promise.reject(error);
      }
      if (!notified) {
        notified = true;
        import_antd.notification.error({ message: first.message, placement: "topRight" });
      }
      if (error.config) {
        error.config.skipNotify = true;
      }
      apiClient.auth.setToken(null);
      apiClient.auth.setRole(null);
      apiClient.auth.setAuthenticator(null);
      setTimeout(() => redirectToSignin(app, false), 1500);
      return Promise.reject(error);
    },
    { unshift: true }
  );
}
function proactivelyVerifyOAuthCallbackToken(app) {
  const apiClient = app == null ? void 0 : app.apiClient;
  if (!(apiClient == null ? void 0 : apiClient.auth)) {
    return;
  }
  let token = null;
  let authenticator = null;
  try {
    const params = new URLSearchParams(window.location.search);
    token = params.get("token");
    authenticator = params.get("authenticator");
  } catch {
    return;
  }
  if (!token) {
    return;
  }
  if (!apiClient.auth.getToken()) {
    apiClient.auth.setToken(token);
  }
  if (authenticator && !apiClient.auth.getAuthenticator()) {
    apiClient.auth.setAuthenticator(authenticator);
  }
  apiClient.resource("auth").check().catch(() => {
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installUserGuardSessionInterceptor,
  proactivelyVerifyOAuthCallbackToken
});
