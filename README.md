# nocobase-plugin-user_guard（用户登录控制 / user-guard）

NocoBase 用户登录控制插件：用户禁用/启用、删除二次验证、禁用用户禁止登录（所有认证方式）并即时失效已登录会话。

- 适用版本：NocoBase 2.x（v1 客户端 `/admin/` 与 v2 客户端 `/v/admin/` 均支持）
- 包名：`nocobase-plugin-user_guard`
- 显示名：用户登录控制 / user-guard

## 功能

1. **用户状态字段**：`users.status`（title「是否启用」，`active`=启用 / `disabled`=禁用，默认 `active`）。插件启用时幂等添加字段并回填存量数据（PostgreSQL `ADD COLUMN ... DEFAULT 'active'` 自动回填），可移植到任意环境。
2. **禁止直接删除用户（二次验证）**：`users:destroy` 必须携带**当前登录用户**的密码（`password` 参数），密码缺失或错误一律拒绝（HTTP 400，`USER_GUARD_PASSWORD_REQUIRED` / `USER_GUARD_PASSWORD_INCORRECT`）。绕过前端直接调用 API 同样被拒绝。
   - **默认用户管理页删除按钮自动隐藏**：plugin-users 原生「用户」页（v1 `/admin/settings/users-permissions/users` 与 v2 `/v/admin/settings/users-permissions/users`）的行内删除与工具栏批量删除按钮均被隐藏（客户端 DOM 观察器，按路径匹配，离开该页自动恢复），删除统一走本插件管理页的密码二次验证。
3. **用户禁用/启用**：自定义 API `userGuard:disable` / `userGuard:enable`；管理页提供状态列（启用/禁用 Tag）与禁用/启用按钮。
4. **禁用用户禁止登录（所有认证方式）**：`auth:signIn` 成功后置检查（覆盖 basic/sms/oauth 等所有认证类型），`status=disabled` 时返回 401（`USER_DISABLED`）并黑名单刚签发的 token（防御纵深）。
5. **已登录会话立即失效**：资源级中间件对每个请求检查当前用户状态，被禁用用户的任意请求返回 401（`USER_DISABLED`）；客户端拦截器自动清空本地认证状态并跳转登录页。
6. **保护规则**：root（id=1）与当前登录用户不可禁用（服务端强制 + 管理页按钮禁用）。

## 边界行为

- **登录被拒**：登录页显示内置错误提示（v1 通知 / v2 表单 Alert，不重复弹框），**6 秒倒计时后自动退出登录**（清空本地认证状态）。
- **被踢**：被禁用用户的会话在刷新/操作页面时收到 401 拦截，自动登出并跳转登录页（带 redirect 参数）。
- **禁用用户仍可手动注销**：`auth:signOut` 在服务端被豁免状态检查，禁用用户点击「注销」可正常退出（返回 200）。
- **第三方 OAuth 登录（如钉钉）被拒**：OAuth 回调会把 token 通过 URL 参数带回前端（`/?authenticator=xxx&token=...`）。插件在客户端启动时主动验证该 token——被禁用用户立即收到**一条**提示（antd 通知）并**整页跳转登录页**（刷新兜底，避免应用初始化卡在空白页）；用户正常时不做干预。
  - **v2 入口（/v/signin）**：拦截钉钉授权 URL（`getAuthUrl` 响应），redirect 参数为空时补 `/v/` 标记——回调落在 v2 应用，被拒后回到 **v2 登录页（/v/signin）**，不会困在 v1 登录页。
  - 提示防重：响应拦截器手动插入 handlers 最前（axios 1.x 的 `use()` 不支持 unshift 选项），并设置 `skipNotify` 阻止内置通知重复弹出——每次流程只弹一条。

## 安装与启用

```bash
# 1. 将插件放入应用 packages/plugins/ 目录（或 npm 安装）
# 2. 构建
yarn nocobase-build   # 或 npx nocobase-build（自动构建 packages/plugins 下全部插件）

# 3. 启用（会自动 install：添加 users.status 字段）
yarn pm enable nocobase-plugin-user_guard

# 4. 重启应用（或 pm2 restart）
yarn start
```

## 使用

### 管理页

- **v1**（`/admin/`）：独立路由 `http://<host>/user-guard`；同时注册设置项「用户与权限 → 用户登录控制」（`/admin/settings/users-permissions/user-guard`，桌面路由模式下设置页可能不可达，请使用独立路由）。
- **v2**（`/v/admin/`）：设置菜单「用户和权限 → 用户登录控制」（`/v/admin/settings/users-permissions/user-guard`）；独立路由 `/v/user-guard`。

管理页功能：
- 用户列表（编号/用户名/昵称/邮箱/**状态**列）
- **禁用/启用**按钮（root 与当前登录用户的禁用按钮禁用）
- **删除**按钮 → 弹窗输入当前登录用户密码 → 二次验证后删除

### API

```bash
# 禁用/启用（POST）
POST /api/userGuard:disable   { "userId": 5 }   # 400: root/self 保护
POST /api/userGuard:enable    { "userId": 5 }

# 删除用户（必须带当前登录用户密码）
POST /api/users:destroy?filterByTk=5   { "password": "当前登录用户密码" }
# 缺密码 → 400 USER_GUARD_PASSWORD_REQUIRED；密码错 → 400 USER_GUARD_PASSWORD_INCORRECT
```

### 错误码

| Code | HTTP | 含义 |
|---|---|---|
| `USER_DISABLED` | 401 | 账号被禁用（登录被拒 / 会话失效） |
| `USER_GUARD_PASSWORD_REQUIRED` | 400 | 删除用户缺少当前登录用户密码 |
| `USER_GUARD_PASSWORD_INCORRECT` | 400 | 当前登录用户密码错误 |
| `USER_GUARD_ROOT_PROTECTED` | 400 | root 用户不可禁用 |
| `USER_GUARD_SELF_PROTECTED` | 400 | 不能禁用当前登录用户 |
| `USER_GUARD_TARGET_NOT_FOUND` | 404 | 目标用户不存在 |

## 源码结构

```
src/
├── server/plugin.ts          # 服务端：字段迁移、登录拦截、请求级状态检查、删除保护、userGuard API
├── client/                   # v1 客户端：会话守卫拦截器 + 管理页注册
├── client-v2/                # v2 客户端：会话守卫拦截器 + 管理页注册
├── shared/
│   ├── constants.ts          # 状态值/错误码/文案 key（v1/v2/服务端共用）
│   ├── sessionGuard.ts       # 401(USER_DISABLED) 拦截：自动登出/跳登录页/6 秒倒计时
│   └── UserGuardTable.tsx    # 管理页组件（纯 antd + apiClient，v1/v2 共用）
└── locale/                   # zh-CN / en-US
```

## 关键设计（Bug 修复说明）

**问题**：被禁用用户点击「注销」无法退出登录。根因：`auth:signOut` 为 loggedIn 权限，认证中间件在处理器执行前校验 token/用户状态，失效会话（用户被删/被禁）时直接返回 401（`NOT_EXIST_USER`/`BLOCKED_TOKEN`），signOut 处理器不执行；SDK `Auth.signOut()` 无 try/catch，401 时本地清理不执行 → 界面卡死。

**修复**（三层）：
1. 服务端：请求级状态检查中间件**豁免 `auth:signOut`**，且禁用用户不黑名单 token（黑名单会使 signOut 也 401），保证禁用用户 signOut 返回 200；
2. 客户端：注册响应拦截器处理 `USER_DISABLED` 401 —— 会话中收到拦截立即清 token 并跳转登录页（吞错避免通知刷屏）；`auth:signIn` 被拒时不吞错（保留登录页内置错误提示）并启动 6 秒倒计时自动退出；
3. 401 响应格式与 NocoBase 原生一致（`{errors:[{message, code}]}` 不包装），v1/v2 客户端均可正确解析。

**users.status 字段的运行时定义**：字段在插件 `load()` 中以集合元数据声明（非 install 时建表），保证每次进程启动模型属性都绑定（`Field.bind()` 机制），应用启动时 `db.sync()` 自动建列并回填默认值。

## 浏览器实测结果（2026-08-07，NocoBase 2.1.34 + PostgreSQL）

### /admin/（v1 客户端）

| 场景 | 结果 |
|---|---|
| 管理页 `/user-guard`：状态列、禁用/启用按钮、删除按钮 | ✅ 正常 |
| root（id=1）行禁用按钮 | ✅ 禁用态（服务端同时拒绝） |
| UI 禁用用户 → 状态列变「禁用」、按钮切换为「启用」、提示成功 | ✅ |
| 禁用用户登录 → 登录页内置提示「该账号已被禁用，请联系管理员。」 | ✅ 无重复弹框 |
| 登录被拒后 6 秒 → 自动退出（本地认证状态清空） | ✅ |
| 禁用用户会话刷新/操作 → 自动登出跳转 `/signin?redirect=...` | ✅ |
| 禁用用户点击「注销」→ 成功退出返回登录页（signOut 200） | ✅ BUG 已修复 |
| 删除弹窗：错误密码 → 「当前登录用户密码错误，无法删除用户。」 | ✅ |
| 删除弹窗：正确密码 → 删除成功 | ✅ |
| 直调 API 删除（无密码/错密码）→ 400 拒绝 | ✅ |
| **默认用户管理页删除按钮（行内 + 批量）隐藏** | ✅ |

### /v/admin/（v2 客户端）

| 场景 | 结果 |
|---|---|
| 设置菜单「用户和权限 → 用户登录控制」页签 | ✅ 已注册 |
| 管理页：状态列、禁用/启用按钮、root 保护 | ✅ |
| UI 启用/禁用用户 | ✅ |
| 删除弹窗（错误/正确密码） | ✅ |
| ACL：无 pm.users 权限（member 角色）访问设置页 → 「当前设置页不可用」 | ✅ |
| 禁用用户会话刷新 → 自动登出跳转 `/v/signin` | ✅ |
| 禁用用户登录 → 表单内 Alert「该账号已被禁用」+ 6 秒自动退出 | ✅ |
| 禁用用户点击「注销」→ 成功退出返回登录页（signOut 200） | ✅ BUG 已修复 |
| **默认用户管理页删除按钮（行内 + 批量）隐藏** | ✅ |
| **钉钉被禁用账号登录被拒 → 提示 + 自动返回登录页（整页跳转，不再卡空白）** | ✅ |
| **钉钉被禁用账号登录被拒（v2 入口）→ 提示 + 返回 v2 登录页（不再困在 v1）** | ✅ |
| **钉钉被拒提示数量 → 每次流程仅 1 条（不再多个提示框）** | ✅ v1/v2 |

### API 冒烟（curl）

禁用/启用、root 保护、self 保护、登录拦截（401 USER_DISABLED）、会话请求拦截、signOut 豁免（200）、删除无密码/错密码/正确密码、启用后恢复登录 —— 全部通过。

## Docker / 可移植性说明

- 无硬编码路径；迁移幂等（`users.status` 缺列才添加，列已存在直接复用）。
- 服务端逻辑不依赖具体认证类型（登录拦截为 signIn 后置检查，覆盖所有认证方式）。
- 构建产物完整：`dist/server`、`dist/client`、`dist/client-v2`、`dist/locale`。
- 启用插件时若 `users.status` 列缺失会自动创建（install 与 load 双保险）。

## License

MIT
