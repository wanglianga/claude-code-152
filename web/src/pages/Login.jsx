import { useState } from 'react';
import { Card, Form, Input, Button, message, Tag, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';
import { ROLE_HOME } from '../constants';

const ACCOUNTS = [
  { u: 'seller1', label: '卖家·张阿姨' },
  { u: 'seller2', label: '卖家·李大叔(有风险记录)' },
  { u: 'buyer1', label: '买家·王小姐' },
  { u: 'buyer2', label: '买家·赵先生' },
  { u: 'appraiser1', label: '估价师' },
  { u: 'warehouse1', label: '仓库' },
  { u: 'refurbisher1', label: '翻新师' },
  { u: 'delivery1', label: '配送员' },
  { u: 'cs1', label: '客服' },
  { u: 'ops1', label: '运营' },
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const doLogin = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      setSession(res.token, res.user);
      message.success(`欢迎，${res.user.name}`);
      navigate(ROLE_HOME[res.user.role] || '/market', { replace: true });
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #2c3e50 0%, #b03a2e 130%)',
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 8px 32px #0003' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#b03a2e' }}>焕新到家</div>
          <div style={{ color: '#888', marginTop: 4 }}>城市二手家具寄卖 · 估价 · 配送 · 售后协同平台</div>
        </div>
        <Form form={form} layout="vertical" onFinish={doLogin} initialValues={{ username: 'seller1', password: '123456' }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登 录
          </Button>
        </Form>
        <Divider plain style={{ margin: '16px 0 8px' }}>测试账号（密码均为 123456，点击填充）</Divider>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ACCOUNTS.map((a) => (
            <Tag
              key={a.u}
              style={{ cursor: 'pointer' }}
              onClick={() => form.setFieldsValue({ username: a.u, password: '123456' })}
            >
              {a.label}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  );
}
