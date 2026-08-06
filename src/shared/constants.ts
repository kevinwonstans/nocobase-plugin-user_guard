/**
 * user_guard 插件共享常量与错误码
 * 服务端与客户端（v1/v2）共用，保证 401 响应 code 一致。
 */

/** 用户状态字段名 */
export const USER_STATUS_FIELD = 'status';

/** 用户状态值 */
export const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

/** 401 响应 code：账号被禁用（客户端拦截器依赖此 code 触发自动登出） */
export const USER_DISABLED_CODE = 'USER_DISABLED';

/** 删除用户时缺少当前登录用户密码 */
export const PASSWORD_REQUIRED_CODE = 'USER_GUARD_PASSWORD_REQUIRED';

/** 删除用户时当前登录用户密码错误 */
export const PASSWORD_INCORRECT_CODE = 'USER_GUARD_PASSWORD_INCORRECT';

/** 受保护用户（root，id=1）不可禁用 */
export const ROOT_PROTECTED_CODE = 'USER_GUARD_ROOT_PROTECTED';

/** 当前登录用户不可禁用自己 */
export const SELF_PROTECTED_CODE = 'USER_GUARD_SELF_PROTECTED';

/** 目标用户不存在 */
export const TARGET_NOT_FOUND_CODE = 'USER_GUARD_TARGET_NOT_FOUND';

/** 受保护：root 用户 id */
export const ROOT_USER_ID = 1;

/** 登录被拒后的自动退出倒计时（秒） */
export const LOGOUT_COUNTDOWN_SECONDS = 6;

/** 服务端 i18n namespace（与包名一致） */
export const PLUGIN_NAMESPACE = 'nocobase-plugin-user_guard';

/** 错误消息 key（文案见 src/locale/*.json） */
export const MSG_KEYS = {
  userDisabled: 'userGuard.userDisabled',
  passwordRequired: 'userGuard.passwordRequired',
  passwordIncorrect: 'userGuard.passwordIncorrect',
  rootProtected: 'userGuard.rootProtected',
  selfProtected: 'userGuard.selfProtected',
  targetNotFound: 'userGuard.targetNotFound',
} as const;
