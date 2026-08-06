import React from 'react';
import { useAPIClient } from '@nocobase/client';
import { UserGuardTable } from '../../shared/UserGuardTable';

/** v1 用户登录控制管理页（注入 v1 apiClient） */
export function UserGuardPage() {
  const apiClient = useAPIClient();
  return <UserGuardTable apiClient={apiClient} />;
}

export default UserGuardPage;
