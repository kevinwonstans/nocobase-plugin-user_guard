import { Application, Plugin } from '@nocobase/client-v2';
import { installUserGuardSessionInterceptor } from '../shared/sessionGuard';
import { UserGuardPage } from './pages/UserGuardPage';

/**
 * v2 客户端（/v/admin/）用户登录控制插件
 *
 * - 安装会话守卫拦截器（与 v1 同一实现）
 * - 在「用户与权限」设置菜单下注册「用户登录控制」页签
 */
export class PluginUserGuardClientV2 extends Plugin<any, Application> {
  async load() {
    installUserGuardSessionInterceptor(this.app as any);

    // 独立路由兜底（设置页签在桌面路由模式下可能不可达）
    this.router.add('user-guard', {
      path: '/user-guard',
      componentLoader: () => Promise.resolve({ default: UserGuardPage }),
    });

    this.pluginSettingsManager.addPageTabItem({
      menuKey: 'users-permissions',
      key: 'user-guard',
      title: this.t('用户登录控制'),
      icon: 'SafetyCertificateOutlined',
      sort: 3,
      aclSnippet: 'pm.users',
      componentLoader: () => Promise.resolve({ default: UserGuardPage }),
    });
  }
}

export default PluginUserGuardClientV2;
