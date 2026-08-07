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
var hideDeleteButtons_exports = {};
__export(hideDeleteButtons_exports, {
  installUserPageDeleteButtonHider: () => installUserPageDeleteButtonHider
});
module.exports = __toCommonJS(hideDeleteButtons_exports);
function installUserPageDeleteButtonHider() {
  const HIDE_ATTR = "data-ug-hide-delete";
  const isUserPage = () => {
    const p = window.location.pathname;
    return p.endsWith("/users-permissions/users") || p.endsWith("/users-permissions/users/");
  };
  const apply = () => {
    const shouldHide = isUserPage();
    document.querySelectorAll(`[${HIDE_ATTR}="1"], button, a`).forEach((el) => {
      if (el.tagName !== "BUTTON" && el.tagName !== "A") {
        return;
      }
      const hidden = el.getAttribute(HIDE_ATTR) === "1";
      const text = (el.textContent || "").trim();
      const isDelete = text === "\u5220\u9664";
      if (shouldHide && isDelete && !hidden) {
        el.setAttribute(HIDE_ATTR, "1");
        el.style.display = "none";
      } else if ((!shouldHide || !isDelete) && hidden) {
        el.removeAttribute(HIDE_ATTR);
        el.style.display = "";
      }
    });
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", apply);
  return () => {
    observer.disconnect();
    window.removeEventListener("popstate", apply);
    document.querySelectorAll(`[${HIDE_ATTR}="1"]`).forEach((el) => {
      el.removeAttribute(HIDE_ATTR);
      el.style.display = "";
    });
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installUserPageDeleteButtonHider
});
