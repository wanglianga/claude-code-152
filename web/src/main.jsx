import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#b03a2e',
        colorInfo: '#b03a2e',
        borderRadius: 6,
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
