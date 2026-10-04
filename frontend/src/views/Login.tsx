import { useState } from 'react';
import { api } from '../api';
import { Field } from '../ui';

const QUICK = [
  ['卖家王阿姨', 'wangjiayi', 'seller123'],
  ['高风险卖家林反悔', 'linfan', 'seller123'],
  ['买家张女士', 'zhangmai', 'buyer123'],
  ['估价师老赵', 'gujia', 'gujia123'],
  ['仓库阿海', 'cangguan', 'cangguan123'],
  ['翻新师老吴', 'fanxin', 'fanxin123'],
  ['配送小马', 'peisong', 'peisong123'],
  ['客服小陈', 'kefu', 'kefu123'],
  ['运营小周', 'ops', 'ops123'],
] as const;

export function Login({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [username, setUsername] = useState('wangjiayi');
  const [password, setPassword] = useState('seller123');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const res = await api('/auth/login', { body: { username, password } });
      onLogin(res.token, res.user);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-hero">
          <h1>🪑 邻栖 · 城市二手家具寄卖平台</h1>
          <p>估价 · 翻新入仓 · 上架 · 配送 · 售后协同 · 结算，一件家具一条链</p>
          <ul>
            <li>估价师上门六项验真，报价/底价/佣金一次给清</li>
            <li>清洁、补漆、拍照、库位、配送范围全程留痕</li>
            <li>反悔、色差、进不了电梯……六方围绕同一家具协同</li>
            <li>结算每笔钱写明来源，品类数据指导入仓还是自提</li>
          </ul>
        </div>
        <div className="login-form">
          <h2>登录</h2>
          <Field label="用户名">
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="密码">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
          {err && <div className="form-error">{err}</div>}
          <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={submit}>
            {busy ? '登录中…' : '登录'}
          </button>
          <div className="hint" style={{ marginTop: 12 }}>演示账号一键填充：</div>
          <div className="quick-accounts">
            {QUICK.map(([label, u, p]) => (
              <button
                key={u}
                onClick={() => {
                  setUsername(u);
                  setPassword(p);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
