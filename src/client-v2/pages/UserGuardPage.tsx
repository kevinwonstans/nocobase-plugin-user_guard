import React from 'react';
import { useApp } from '@nocobase/client-v2';
import { UserGuardTable } from '../../shared/UserGuardTable';

/** v2 用户登录控制管理页（注入 v2 app 的 apiClient） */
export function UserGuardPage() {
  const app = useApp();
  return <UserGuardTable apiClient={app.apiClient} />;
}

export default UserGuardPage;
