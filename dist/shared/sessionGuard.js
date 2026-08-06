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
  installUserGuardSessionInterceptor: () => installUserGuardSessionInterceptor
});
module.exports = __toCommonJS(sessionGuard_exports);
var import_constants = require("./constants");
function getLocation(app) {
  var _a, _b, _c;
  const loc = (_c = (_b = (_a = app.router) == null ? void 0 : _a.router) == null ? void 0 : _b.state) == null ? void 0 : _c.location;
  const pathname = (loc == null ? void 0 : loc.pathname) ?? window.location.pathname ?? "";
  const search = (loc == null ? void 0 : loc.search) ?? window.location.search ?? "";
  return { pathname, search };
}
function redirectToSignin(app, replace = false) {
  var _a;
  const router = app.router;
  const { pathname, search } = getLocation(app);
  if (pathname.endsWith("/signin") || pathname.endsWith("/signin/")) {
    return;
  }
  const basename = (router == null ? void 0 : router.basename) ?? "/admin";
  const rawPath = pathname.startsWith(basename) ? pathname.slice(basename.length) : pathname;
  const redirect = encodeURIComponent(`${rawPath.startsWith("/") ? rawPath : `/${rawPath}` || "/"}${search}`);
  (_a = router == null ? void 0 : router.navigate) == null ? void 0 : _a.call(router, `/signin?redirect=${redirect}`, { replace });
}
function installUserGuardSessionInterceptor(app) {
  const apiClient = app.apiClient;
  if (!(apiClient == null ? void 0 : apiClient.axios)) {
    return;
  }
  let countdownTimer = null;
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
      apiClient.auth.setToken(null);
      apiClient.auth.setRole(null);
      apiClient.auth.setAuthenticator(null);
      redirectToSignin(app, false);
      return new Promise(() => {
      });
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installUserGuardSessionInterceptor
});
