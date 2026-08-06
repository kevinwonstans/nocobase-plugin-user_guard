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
var constants_exports = {};
__export(constants_exports, {
  LOGOUT_COUNTDOWN_SECONDS: () => LOGOUT_COUNTDOWN_SECONDS,
  MSG_KEYS: () => MSG_KEYS,
  PASSWORD_INCORRECT_CODE: () => PASSWORD_INCORRECT_CODE,
  PASSWORD_REQUIRED_CODE: () => PASSWORD_REQUIRED_CODE,
  PLUGIN_NAMESPACE: () => PLUGIN_NAMESPACE,
  ROOT_PROTECTED_CODE: () => ROOT_PROTECTED_CODE,
  ROOT_USER_ID: () => ROOT_USER_ID,
  SELF_PROTECTED_CODE: () => SELF_PROTECTED_CODE,
  TARGET_NOT_FOUND_CODE: () => TARGET_NOT_FOUND_CODE,
  USER_DISABLED_CODE: () => USER_DISABLED_CODE,
  USER_STATUS: () => USER_STATUS,
  USER_STATUS_FIELD: () => USER_STATUS_FIELD
});
module.exports = __toCommonJS(constants_exports);
const USER_STATUS_FIELD = "status";
const USER_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
};
const USER_DISABLED_CODE = "USER_DISABLED";
const PASSWORD_REQUIRED_CODE = "USER_GUARD_PASSWORD_REQUIRED";
const PASSWORD_INCORRECT_CODE = "USER_GUARD_PASSWORD_INCORRECT";
const ROOT_PROTECTED_CODE = "USER_GUARD_ROOT_PROTECTED";
const SELF_PROTECTED_CODE = "USER_GUARD_SELF_PROTECTED";
const TARGET_NOT_FOUND_CODE = "USER_GUARD_TARGET_NOT_FOUND";
const ROOT_USER_ID = 1;
const LOGOUT_COUNTDOWN_SECONDS = 6;
const PLUGIN_NAMESPACE = "nocobase-plugin-user_guard";
const MSG_KEYS = {
  userDisabled: "userGuard.userDisabled",
  passwordRequired: "userGuard.passwordRequired",
  passwordIncorrect: "userGuard.passwordIncorrect",
  rootProtected: "userGuard.rootProtected",
  selfProtected: "userGuard.selfProtected",
  targetNotFound: "userGuard.targetNotFound"
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LOGOUT_COUNTDOWN_SECONDS,
  MSG_KEYS,
  PASSWORD_INCORRECT_CODE,
  PASSWORD_REQUIRED_CODE,
  PLUGIN_NAMESPACE,
  ROOT_PROTECTED_CODE,
  ROOT_USER_ID,
  SELF_PROTECTED_CODE,
  TARGET_NOT_FOUND_CODE,
  USER_DISABLED_CODE,
  USER_STATUS,
  USER_STATUS_FIELD
});
