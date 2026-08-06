/**
 * 用户登录控制管理页（v1/v2 共用）
 * 纯 antd 实现 + 传入的 apiClient，避免依赖 v1/v2 各自的 React 上下文。
 *
 * 功能：
 * - 用户列表（状态列：启用/禁用）
 * - 禁用/启用按钮（root id=1 与当前登录用户不可禁用，按钮禁用 + 服务端强制）
 * - 删除二次验证：弹窗输入当前登录用户密码，经 users:destroy 提交（服务端校验）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Space, Table, Tag, message } from 'antd';
import { ROOT_USER_ID, USER_STATUS, USER_STATUS_FIELD } from './constants';

interface UserGuardTableProps {
  apiClient: any;
}

function getErrorMessage(err: any, fallback: string): string {
  const errors = err?.response?.data?.errors;
  if (Array.isArray(errors) && errors[0]?.message) {
    return errors[0].message;
  }
  return err?.message ?? fallback;
}

export function UserGuardTable({ apiClient }: UserGuardTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();

  // 删除弹窗状态
  const [deleting, setDeleting] = useState<any | null>(null);
  const [password, setPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const res = await apiClient.resource('users').list(
          { page: p, pageSize: ps, sort: ['id'] },
          { skipNotify: true },
        );
        const data = res?.data?.data ?? [];
        setRows(data);
        setTotal(res?.data?.meta?.count ?? data.length);
        setPage(p);
        setPageSize(ps);
      } catch (err) {
        message.error(getErrorMessage(err, '加载用户列表失败'));
      } finally {
        setLoading(false);
      }
    },
    [apiClient, page, pageSize],
  );

  useEffect(() => {
    // 登录守卫：独立路由页面未登录时跳转登录页
    const token = apiClient?.auth?.getToken?.() ?? apiClient?.auth?.token;
    if (!token) {
      window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    load(1, 20);
    // 获取当前登录用户 id（用于保护规则展示）
    apiClient
      .resource('auth')
      .check()
      .then((res: any) => setCurrentUserId(res?.data?.data?.id))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (userId: number, action: 'disable' | 'enable') => {
    try {
      await apiClient.resource('userGuard')[action]({ values: { userId } }, { skipNotify: true });
      message.success(action === 'disable' ? '已禁用该用户' : '已启用该用户');
      load();
    } catch (err) {
      message.error(getErrorMessage(err, action === 'disable' ? '禁用失败' : '启用失败'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !password) {
      return;
    }
    setDeleteLoading(true);
    try {
      await apiClient.resource('users').destroy(
        { filterByTk: deleting.id, values: { password } },
        { skipNotify: true },
      );
      message.success('已删除用户');
      setDeleting(null);
      setPassword('');
      load();
    } catch (err) {
      message.error(getErrorMessage(err, '删除失败'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 180,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 180,
      render: (v: string) => v ?? '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 220,
      render: (v: string) => v ?? '-',
    },
    {
      title: '状态',
      dataIndex: USER_STATUS_FIELD,
      width: 100,
      render: (v: string) =>
        v === USER_STATUS.DISABLED ? <Tag color="red">禁用</Tag> : <Tag color="green">启用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: any) => {
        const isRoot = Number(record.id) === ROOT_USER_ID;
        const isSelf = Number(record.id) === Number(currentUserId);
        const disabled = record[USER_STATUS_FIELD] === USER_STATUS.DISABLED;
        return (
          <Space>
            {disabled ? (
              <Button
                size="small"
                type="link"
                onClick={() => setStatus(record.id, 'enable')}
              >
                启用
              </Button>
            ) : (
              <Button
                size="small"
                type="link"
                danger
                disabled={isRoot || isSelf}
                title={isRoot ? 'root 用户不可禁用' : isSelf ? '不能禁用当前登录用户' : undefined}
                onClick={() => setStatus(record.id, 'disable')}
              >
                禁用
              </Button>
            )}
            <Button size="small" type="link" danger onClick={() => setDeleting(record)}>
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => load(p, ps),
        }}
      />
      <Modal
        title={`删除用户：${deleting?.username ?? ''}（id=${deleting?.id ?? ''}）`}
        open={!!deleting}
        onCancel={() => {
          setDeleting(null);
          setPassword('');
        }}
        onOk={confirmDelete}
        confirmLoading={deleteLoading}
        okText="确认删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <p>删除操作不可恢复。请输入<strong>当前登录用户</strong>的密码进行二次验证：</p>
        <Input.Password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="当前登录用户密码"
          onPressEnter={confirmDelete}
          autoFocus
        />
      </Modal>
    </div>
  );
}

export default UserGuardTable;
