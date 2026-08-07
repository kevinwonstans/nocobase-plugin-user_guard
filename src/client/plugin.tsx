import { Plugin } from '@nocobase/client';
import { installUserGuardSessionInterceptor } from '../shared/sessionGuard';
import { installUserPageDeleteButtonHider } from '../shared/hideDeleteButtons';
import { UserGuardPage } from './pages/UserGuardPage';

/**
 * v1 客户端（/admin/）用户登录控制插件
 *
 * - 安装会话守卫拦截器：禁用用户的 401（USER_DISABLED）→ 清本地认证状态并跳转登录页；
 *   登录被拒时 6 秒倒计时后自动退出（登录页内置错误提示保留，不重复弹框）
 * - 隐藏默认用户管理页的删除按钮（删除统一走密码二次验证）
 * - 在「用户与权限」下注册「用户登录控制」管理页
 */
export class PluginUserGuardClient extends Plugin {
  async load() {
    installUserGuardSessionInterceptor(this.app as any);
    installUserPageDeleteButtonHider();

    // 注册独立路由（桌面路由模式下 admin 布局不挂载 pluginSettingsManager 设置页，
    // 独立路由保证 /user-guard 可直接访问管理页）
    this.app.router.add('user-guard', {
      path: '/user-guard',
      componentLoader: () => Promise.resolve({ default: UserGuardPage }),
    });

    this.app.pluginSettingsManager.add('users-permissions.user-guard', {
      title: '用户登录控制',
      icon: 'SafetyCertificateOutlined',
      sort: 300,
      aclSnippet: 'pm.users',
      componentLoader: () => Promise.resolve({ default: UserGuardPage }),
    });
  }
}

export default PluginUserGuardClient;
