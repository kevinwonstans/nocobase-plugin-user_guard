/**
 * 用户登录控制管理页（v1/v2 共用）
 * 纯 antd 实现 + 传入的 apiClient，避免依赖 v1/v2 各自的 React 上下文。
 *
 * 功能：
 * - 用户列表（状态列：启用/禁用）
 * - 禁用/启用按钮（root id=1 与当前登录用户不可禁用，按钮禁用 + 服务端强制）
 * - 删除二次验证：弹窗输入当前登录用户密码，经 users:destroy 提交（服务端校验）
 */
import React from 'react';
interface UserGuardTableProps {
    apiClient: any;
}
export declare function UserGuardTable({ apiClient }: UserGuardTableProps): React.JSX.Element;
export default UserGuardTable;
