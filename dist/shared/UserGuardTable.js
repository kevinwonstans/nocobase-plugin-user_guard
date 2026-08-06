/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var UserGuardTable_exports = {};
__export(UserGuardTable_exports, {
  UserGuardTable: () => UserGuardTable,
  default: () => UserGuardTable_default
});
module.exports = __toCommonJS(UserGuardTable_exports);
var import_react = __toESM(require("react"));
var import_antd = require("antd");
var import_constants = require("./constants");
function getErrorMessage(err, fallback) {
  var _a, _b, _c;
  const errors = (_b = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.data) == null ? void 0 : _b.errors;
  if (Array.isArray(errors) && ((_c = errors[0]) == null ? void 0 : _c.message)) {
    return errors[0].message;
  }
  return (err == null ? void 0 : err.message) ?? fallback;
}
function UserGuardTable({ apiClient }) {
  const [rows, setRows] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [page, setPage] = (0, import_react.useState)(1);
  const [pageSize, setPageSize] = (0, import_react.useState)(20);
  const [total, setTotal] = (0, import_react.useState)(0);
  const [currentUserId, setCurrentUserId] = (0, import_react.useState)();
  const [deleting, setDeleting] = (0, import_react.useState)(null);
  const [password, setPassword] = (0, import_react.useState)("");
  const [deleteLoading, setDeleteLoading] = (0, import_react.useState)(false);
  const load = (0, import_react.useCallback)(
    async (p = page, ps = pageSize) => {
      var _a, _b, _c;
      setLoading(true);
      try {
        const res = await apiClient.resource("users").list(
          { page: p, pageSize: ps, sort: ["id"] },
          { skipNotify: true }
        );
        const data = ((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data) ?? [];
        setRows(data);
        setTotal(((_c = (_b = res == null ? void 0 : res.data) == null ? void 0 : _b.meta) == null ? void 0 : _c.count) ?? data.length);
        setPage(p);
        setPageSize(ps);
      } catch (err) {
        import_antd.message.error(getErrorMessage(err, "\u52A0\u8F7D\u7528\u6237\u5217\u8868\u5931\u8D25"));
      } finally {
        setLoading(false);
      }
    },
    [apiClient, page, pageSize]
  );
  (0, import_react.useEffect)(() => {
    var _a, _b, _c;
    const token = ((_b = (_a = apiClient == null ? void 0 : apiClient.auth) == null ? void 0 : _a.getToken) == null ? void 0 : _b.call(_a)) ?? ((_c = apiClient == null ? void 0 : apiClient.auth) == null ? void 0 : _c.token);
    if (!token) {
      window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    load(1, 20);
    apiClient.resource("auth").check().then((res) => {
      var _a2, _b2;
      return setCurrentUserId((_b2 = (_a2 = res == null ? void 0 : res.data) == null ? void 0 : _a2.data) == null ? void 0 : _b2.id);
    }).catch(() => {
    });
  }, []);
  const setStatus = async (userId, action) => {
    try {
      await apiClient.resource("userGuard")[action]({ values: { userId } }, { skipNotify: true });
      import_antd.message.success(action === "disable" ? "\u5DF2\u7981\u7528\u8BE5\u7528\u6237" : "\u5DF2\u542F\u7528\u8BE5\u7528\u6237");
      load();
    } catch (err) {
      import_antd.message.error(getErrorMessage(err, action === "disable" ? "\u7981\u7528\u5931\u8D25" : "\u542F\u7528\u5931\u8D25"));
    }
  };
  const confirmDelete = async () => {
    if (!deleting || !password) {
      return;
    }
    setDeleteLoading(true);
    try {
      await apiClient.resource("users").destroy(
        { filterByTk: deleting.id, values: { password } },
        { skipNotify: true }
      );
      import_antd.message.success("\u5DF2\u5220\u9664\u7528\u6237");
      setDeleting(null);
      setPassword("");
      load();
    } catch (err) {
      import_antd.message.error(getErrorMessage(err, "\u5220\u9664\u5931\u8D25"));
    } finally {
      setDeleteLoading(false);
    }
  };
  const columns = [
    {
      title: "\u7F16\u53F7",
      dataIndex: "id",
      width: 80
    },
    {
      title: "\u7528\u6237\u540D",
      dataIndex: "username",
      width: 180
    },
    {
      title: "\u6635\u79F0",
      dataIndex: "nickname",
      width: 180,
      render: (v) => v ?? "-"
    },
    {
      title: "\u90AE\u7BB1",
      dataIndex: "email",
      width: 220,
      render: (v) => v ?? "-"
    },
    {
      title: "\u72B6\u6001",
      dataIndex: import_constants.USER_STATUS_FIELD,
      width: 100,
      render: (v) => v === import_constants.USER_STATUS.DISABLED ? /* @__PURE__ */ import_react.default.createElement(import_antd.Tag, { color: "red" }, "\u7981\u7528") : /* @__PURE__ */ import_react.default.createElement(import_antd.Tag, { color: "green" }, "\u542F\u7528")
    },
    {
      title: "\u64CD\u4F5C",
      key: "actions",
      render: (_, record) => {
        const isRoot = Number(record.id) === import_constants.ROOT_USER_ID;
        const isSelf = Number(record.id) === Number(currentUserId);
        const disabled = record[import_constants.USER_STATUS_FIELD] === import_constants.USER_STATUS.DISABLED;
        return /* @__PURE__ */ import_react.default.createElement(import_antd.Space, null, disabled ? /* @__PURE__ */ import_react.default.createElement(
          import_antd.Button,
          {
            size: "small",
            type: "link",
            onClick: () => setStatus(record.id, "enable")
          },
          "\u542F\u7528"
        ) : /* @__PURE__ */ import_react.default.createElement(
          import_antd.Button,
          {
            size: "small",
            type: "link",
            danger: true,
            disabled: isRoot || isSelf,
            title: isRoot ? "root \u7528\u6237\u4E0D\u53EF\u7981\u7528" : isSelf ? "\u4E0D\u80FD\u7981\u7528\u5F53\u524D\u767B\u5F55\u7528\u6237" : void 0,
            onClick: () => setStatus(record.id, "disable")
          },
          "\u7981\u7528"
        ), /* @__PURE__ */ import_react.default.createElement(import_antd.Button, { size: "small", type: "link", danger: true, onClick: () => setDeleting(record) }, "\u5220\u9664"));
      }
    }
  ];
  return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement(
    import_antd.Table,
    {
      rowKey: "id",
      columns,
      dataSource: rows,
      loading,
      pagination: {
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: (p, ps) => load(p, ps)
      }
    }
  ), /* @__PURE__ */ import_react.default.createElement(
    import_antd.Modal,
    {
      title: `\u5220\u9664\u7528\u6237\uFF1A${(deleting == null ? void 0 : deleting.username) ?? ""}\uFF08id=${(deleting == null ? void 0 : deleting.id) ?? ""}\uFF09`,
      open: !!deleting,
      onCancel: () => {
        setDeleting(null);
        setPassword("");
      },
      onOk: confirmDelete,
      confirmLoading: deleteLoading,
      okText: "\u786E\u8BA4\u5220\u9664",
      okButtonProps: { danger: true },
      cancelText: "\u53D6\u6D88"
    },
    /* @__PURE__ */ import_react.default.createElement("p", null, "\u5220\u9664\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002\u8BF7\u8F93\u5165", /* @__PURE__ */ import_react.default.createElement("strong", null, "\u5F53\u524D\u767B\u5F55\u7528\u6237"), "\u7684\u5BC6\u7801\u8FDB\u884C\u4E8C\u6B21\u9A8C\u8BC1\uFF1A"),
    /* @__PURE__ */ import_react.default.createElement(
      import_antd.Input.Password,
      {
        value: password,
        onChange: (e) => setPassword(e.target.value),
        placeholder: "\u5F53\u524D\u767B\u5F55\u7528\u6237\u5BC6\u7801",
        onPressEnter: confirmDelete,
        autoFocus: true
      }
    )
  ));
}
var UserGuardTable_default = UserGuardTable;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UserGuardTable
});
