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
var plugin_exports = {};
__export(plugin_exports, {
  PluginUserGuardServer: () => PluginUserGuardServer,
  default: () => plugin_default
});
module.exports = __toCommonJS(plugin_exports);
var import_server = require("@nocobase/server");
var import_constants = require("../shared/constants");
class PluginUserGuardServer extends import_server.Plugin {
  async load() {
    const usersCollection = this.db.getCollection("users");
    if (usersCollection && !usersCollection.hasField(import_constants.USER_STATUS_FIELD)) {
      usersCollection.addField(import_constants.USER_STATUS_FIELD, {
        type: "string",
        title: "\u662F\u5426\u542F\u7528",
        defaultValue: import_constants.USER_STATUS.ACTIVE,
        interface: "select",
        uiSchema: {
          type: "string",
          title: "\u662F\u5426\u542F\u7528",
          "x-component": "Select",
          enum: [
            { label: "\u542F\u7528", value: import_constants.USER_STATUS.ACTIVE },
            { label: "\u7981\u7528", value: import_constants.USER_STATUS.DISABLED }
          ]
        }
      });
    }
    this.app.use(
      async (ctx, next) => {
        var _a, _b, _c, _d, _e;
        await next();
        const { resourceName, actionName } = ctx.action ?? {};
        if (resourceName !== "auth" || actionName !== "signIn" || ctx.status !== 200) {
          return;
        }
        const user = (_a = ctx.body) == null ? void 0 : _a.user;
        if (!user || user[import_constants.USER_STATUS_FIELD] !== import_constants.USER_STATUS.DISABLED) {
          return;
        }
        const token = (_b = ctx.body) == null ? void 0 : _b.token;
        if (token && ((_c = ctx.auth) == null ? void 0 : _c.jwt)) {
          try {
            await ctx.auth.jwt.block(token);
          } catch (err) {
            (_e = (_d = ctx.logger) == null ? void 0 : _d.warn) == null ? void 0 : _e.call(_d, "user_guard: block issued token failed", { err });
          }
        }
        ctx.withoutDataWrapping = true;
        ctx.status = 401;
        ctx.body = {
          errors: [
            {
              message: ctx.t(import_constants.MSG_KEYS.userDisabled, { ns: import_constants.PLUGIN_NAMESPACE }),
              code: import_constants.USER_DISABLED_CODE
            }
          ]
        };
      },
      { tag: "userGuardSignIn", after: "dataSource" }
    );
    this.app.resourceManager.use(
      async (ctx, next) => {
        var _a, _b, _c;
        const { resourceName, actionName } = ctx.action ?? {};
        const currentUser = (_a = ctx.state) == null ? void 0 : _a.currentUser;
        if (currentUser == null ? void 0 : currentUser.id) {
          const isSignOut = resourceName === "auth" && actionName === "signOut";
          if (!isSignOut && currentUser[import_constants.USER_STATUS_FIELD] === import_constants.USER_STATUS.DISABLED) {
            ctx.throw(401, {
              message: ctx.t(import_constants.MSG_KEYS.userDisabled, { ns: import_constants.PLUGIN_NAMESPACE }),
              code: import_constants.USER_DISABLED_CODE
            });
          }
        }
        if (resourceName === "users" && actionName === "destroy") {
          const params = ctx.action.params ?? {};
          const password = params.password ?? ((_b = params.values) == null ? void 0 : _b.password);
          if (!(currentUser == null ? void 0 : currentUser.id)) {
            ctx.throw(401, {
              message: ctx.t(import_constants.MSG_KEYS.passwordRequired, { ns: import_constants.PLUGIN_NAMESPACE }),
              code: import_constants.PASSWORD_REQUIRED_CODE
            });
          }
          if (!password) {
            ctx.throw(400, {
              message: ctx.t(import_constants.MSG_KEYS.passwordRequired, { ns: import_constants.PLUGIN_NAMESPACE }),
              code: import_constants.PASSWORD_REQUIRED_CODE
            });
          }
          const usersCollection2 = ctx.db.getCollection("users");
          const passwordField = usersCollection2 == null ? void 0 : usersCollection2.getField("password");
          const me = await ctx.db.getRepository("users").findOne({ filter: { id: currentUser.id } });
          const valid = passwordField ? await passwordField.verify(password, (_c = me == null ? void 0 : me.get) == null ? void 0 : _c.call(me, "password")) : false;
          if (!valid) {
            ctx.throw(400, {
              message: ctx.t(import_constants.MSG_KEYS.passwordIncorrect, { ns: import_constants.PLUGIN_NAMESPACE }),
              code: import_constants.PASSWORD_INCORRECT_CODE
            });
          }
        }
        await next();
      },
      { group: "userGuard", after: "auth", before: "acl" }
    );
    this.app.resourceManager.define({
      name: "userGuard",
      actions: {
        disable: async (ctx) => {
          const { userId } = ctx.action.params.values ?? {};
          const currentUser = ctx.state.currentUser;
          await this.setStatus(ctx, userId, currentUser, import_constants.USER_STATUS.DISABLED);
        },
        enable: async (ctx) => {
          const { userId } = ctx.action.params.values ?? {};
          const currentUser = ctx.state.currentUser;
          await this.setStatus(ctx, userId, currentUser, import_constants.USER_STATUS.ACTIVE);
        }
      }
    });
    this.app.acl.allow("userGuard", ["disable", "enable"], "loggedIn");
    this.app.acl.use(async (ctx, next) => {
      var _a, _b, _c, _d, _e, _f;
      const { resourceName, actionName } = ctx.permission ?? {};
      if (resourceName === "users" && actionName === "destroy") {
        const params = ((_a = ctx.action) == null ? void 0 : _a.params) ?? {};
        const password = params.password ?? ((_b = params.values) == null ? void 0 : _b.password);
        if (!password) {
          if (((_d = (_c = ctx.action) == null ? void 0 : _c.params) == null ? void 0 : _d.filterByTk) !== void 0 || ((_f = (_e = ctx.action) == null ? void 0 : _e.params) == null ? void 0 : _f.filter) !== void 0) {
            ctx.throw(403, "No permissions");
          }
          ctx.permission = { ...ctx.permission, can: null };
        }
      }
      await next();
    });
  }
  /** 禁用/启用共用逻辑（含保护规则） */
  async setStatus(ctx, userId, currentUser, status) {
    if (!(currentUser == null ? void 0 : currentUser.id)) {
      ctx.throw(401, "Unauthenticated");
    }
    const targetId = Number(userId);
    if (!targetId) {
      ctx.throw(400, "userId is required");
    }
    if (targetId === import_constants.ROOT_USER_ID) {
      ctx.throw(400, {
        message: ctx.t(import_constants.MSG_KEYS.rootProtected, { ns: import_constants.PLUGIN_NAMESPACE }),
        code: import_constants.ROOT_PROTECTED_CODE
      });
    }
    if (targetId === Number(currentUser.id)) {
      ctx.throw(400, {
        message: ctx.t(import_constants.MSG_KEYS.selfProtected, { ns: import_constants.PLUGIN_NAMESPACE }),
        code: import_constants.SELF_PROTECTED_CODE
      });
    }
    const repo = ctx.db.getRepository("users");
    const target = await repo.findOne({ filter: { id: targetId } });
    if (!target) {
      ctx.throw(404, {
        message: ctx.t(import_constants.MSG_KEYS.targetNotFound, { ns: import_constants.PLUGIN_NAMESPACE }),
        code: import_constants.TARGET_NOT_FOUND_CODE
      });
    }
    await repo.update({ filterByTk: targetId, values: { [import_constants.USER_STATUS_FIELD]: status } });
    ctx.body = await repo.findOne({ filter: { id: targetId } });
  }
}
var plugin_default = PluginUserGuardServer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PluginUserGuardServer
});
