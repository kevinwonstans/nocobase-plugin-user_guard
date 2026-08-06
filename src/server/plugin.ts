import { Plugin } from '@nocobase/server';
import {
  MSG_KEYS,
  PLUGIN_NAMESPACE,
  PASSWORD_INCORRECT_CODE,
  PASSWORD_REQUIRED_CODE,
  ROOT_PROTECTED_CODE,
  ROOT_USER_ID,
  SELF_PROTECTED_CODE,
  TARGET_NOT_FOUND_CODE,
  USER_DISABLED_CODE,
  USER_STATUS,
  USER_STATUS_FIELD,
} from '../shared/constants';

/**
 * 用户登录控制（user-guard）服务端插件
 *
 * 核心能力：
 * 1. users.status 字段迁移（幂等，缺列则补，并回填 active）
 * 2. 登录拦截：auth:signIn 成功响应中 user.status === 'disabled' 时，
 *    改写为 401（code: USER_DISABLED）并黑名单刚签发的 token
 * 3. 请求级状态检查：已登录且被禁用的用户，除 auth:signOut 外一律 401（会话即时失效）
 * 4. 删除二次验证：users:destroy 必须携带当前登录用户密码，缺失/错误一律拒绝
 * 5. userGuard:disable / userGuard:enable 自定义 API，保护 root(id=1) 与当前登录用户
 */
export class PluginUserGuardServer extends Plugin {
  async load() {    // 0. 确保 users.status 字段在集合定义中（元数据，启动时 db.sync 自动建列/回填默认值）
    //    必须在 load() 中声明而非 install()：install 只在新进程运行一次，
    //    而每次启动都需要该字段定义以绑定 Sequelize 模型属性。
    const usersCollection = this.db.getCollection('users');
    if (usersCollection && !usersCollection.hasField(USER_STATUS_FIELD)) {
      usersCollection.addField(USER_STATUS_FIELD, {
        type: 'string',
        title: '是否启用',
        defaultValue: USER_STATUS.ACTIVE,
        interface: 'select',
        uiSchema: {
          type: 'string',
          title: '是否启用',
          'x-component': 'Select',
          enum: [
            { label: '启用', value: USER_STATUS.ACTIVE },
            { label: '禁用', value: USER_STATUS.DISABLED },
          ],
        },
      });
    }

    // 一、登录拦截：signIn 成功后置检查（覆盖所有认证方式）
    // 注册在 dataSource 之后，此时 action 处理器已执行、ctx.body 已就绪
    this.app.use(
      async (ctx, next) => {
        await next();
        const { resourceName, actionName } = ctx.action ?? {};
        if (resourceName !== 'auth' || actionName !== 'signIn' || ctx.status !== 200) {
          return;
        }
        // 注意：此处 ctx.body 尚未经过 dataWrapping（为 { user, token } 原样）
        const user = ctx.body?.user;
        if (!user || user[USER_STATUS_FIELD] !== USER_STATUS.DISABLED) {
          return;
        }
        // 防御纵深：黑名单刚签发的 token，确保任何已发出的 token 不可用
        const token = ctx.body?.token;
        if (token && ctx.auth?.jwt) {
          try {
            await ctx.auth.jwt.block(token);
          } catch (err) {
            ctx.logger?.warn?.('user_guard: block issued token failed', { err });
          }
        }
        // 响应格式与认证中间件 401 一致：{errors:[...]} 不包装（withoutDataWrapping 跳过 dataWrapping）
        ctx.withoutDataWrapping = true;
        ctx.status = 401;
        ctx.body = {
          errors: [
            {
              message: ctx.t(MSG_KEYS.userDisabled, { ns: PLUGIN_NAMESPACE }),
              code: USER_DISABLED_CODE,
            },
          ],
        };
      },
      { tag: 'userGuardSignIn', after: 'dataSource' },
    );

    // 二、请求级状态检查 + 删除二次验证（资源级中间件，认证之后、ACL 之前）
    this.app.resourceManager.use(
      async (ctx, next) => {
        const { resourceName, actionName } = ctx.action ?? {};
        const currentUser = ctx.state?.currentUser;
        if (currentUser?.id) {
          // 被禁用用户的会话即时失效；auth:signOut 豁免，保证禁用用户仍可手动退出
          const isSignOut = resourceName === 'auth' && actionName === 'signOut';
          if (!isSignOut && currentUser[USER_STATUS_FIELD] === USER_STATUS.DISABLED) {
            ctx.throw(401, {
              message: ctx.t(MSG_KEYS.userDisabled, { ns: PLUGIN_NAMESPACE }),
              code: USER_DISABLED_CODE,
            });
          }
        }

        // 删除二次验证：users:destroy 必须携带当前登录用户密码
        if (resourceName === 'users' && actionName === 'destroy') {
          const params = ctx.action.params ?? {};
          const password = params.password ?? params.values?.password;
          if (!currentUser?.id) {
            ctx.throw(401, {
              message: ctx.t(MSG_KEYS.passwordRequired, { ns: PLUGIN_NAMESPACE }),
              code: PASSWORD_REQUIRED_CODE,
            });
          }
          if (!password) {
            ctx.throw(400, {
              message: ctx.t(MSG_KEYS.passwordRequired, { ns: PLUGIN_NAMESPACE }),
              code: PASSWORD_REQUIRED_CODE,
            });
          }
          const usersCollection = ctx.db.getCollection('users');
          const passwordField = usersCollection?.getField('password');
          const me = await ctx.db
            .getRepository('users')
            .findOne({ filter: { id: currentUser.id } });
          const valid = passwordField
            ? await passwordField.verify(password, me?.get?.('password'))
            : false;
          if (!valid) {
            ctx.throw(400, {
              message: ctx.t(MSG_KEYS.passwordIncorrect, { ns: PLUGIN_NAMESPACE }),
              code: PASSWORD_INCORRECT_CODE,
            });
          }
        }

        await next();
      },
      { group: 'userGuard', after: 'auth', before: 'acl' },
    );

    // 三、禁用/启用自定义 API
    this.app.resourceManager.define({
      name: 'userGuard',
      actions: {
        disable: async (ctx) => {
          const { userId } = ctx.action.params.values ?? {};
          const currentUser = ctx.state.currentUser;
          await this.setStatus(ctx, userId, currentUser, USER_STATUS.DISABLED);
        },
        enable: async (ctx) => {
          const { userId } = ctx.action.params.values ?? {};
          const currentUser = ctx.state.currentUser;
          await this.setStatus(ctx, userId, currentUser, USER_STATUS.ACTIVE);
        },
      },
    });
    this.app.acl.allow('userGuard', ['disable', 'enable'], 'loggedIn');
  }

  /** 禁用/启用共用逻辑（含保护规则） */
  private async setStatus(ctx: any, userId: unknown, currentUser: any, status: string) {
    if (!currentUser?.id) {
      ctx.throw(401, 'Unauthenticated');
    }
    const targetId = Number(userId);
    if (!targetId) {
      ctx.throw(400, 'userId is required');
    }
    if (targetId === ROOT_USER_ID) {
      ctx.throw(400, {
        message: ctx.t(MSG_KEYS.rootProtected, { ns: PLUGIN_NAMESPACE }),
        code: ROOT_PROTECTED_CODE,
      });
    }
    if (targetId === Number(currentUser.id)) {
      ctx.throw(400, {
        message: ctx.t(MSG_KEYS.selfProtected, { ns: PLUGIN_NAMESPACE }),
        code: SELF_PROTECTED_CODE,
      });
    }
    const repo = ctx.db.getRepository('users');
    const target = await repo.findOne({ filter: { id: targetId } });
    if (!target) {
      ctx.throw(404, {
        message: ctx.t(MSG_KEYS.targetNotFound, { ns: PLUGIN_NAMESPACE }),
        code: TARGET_NOT_FOUND_CODE,
      });
    }
    await repo.update({ filterByTk: targetId, values: { [USER_STATUS_FIELD]: status } });
    ctx.body = await repo.findOne({ filter: { id: targetId } });
  }
}

export default PluginUserGuardServer;
