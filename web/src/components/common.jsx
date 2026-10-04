import { Tag, Image, Empty } from 'antd';

export function StatusTag({ map, value }) {
  const conf = map[value] || { label: value, color: 'default' };
  return <Tag color={conf.color}>{conf.label}</Tag>;
}

export function Photos({ urls, size = 96 }) {
  if (!urls || urls.length === 0) {
    return (
      <div
        style={{
          width: size, height: size * 0.7, background: '#f0f0f0', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#999', fontSize: 12,
        }}
      >
        暂无照片
      </div>
    );
  }
  return (
    <Image.PreviewGroup>
      {urls.map((u, i) => (
        <Image
          key={i}
          src={u}
          width={size}
          height={size * 0.7}
          style={{ objectFit: 'cover', borderRadius: 6, marginRight: 8 }}
        />
      ))}
    </Image.PreviewGroup>
  );
}

export function Money({ value, suffix = ' 元' }) {
  return (
    <span style={{ fontWeight: 600 }}>
      {Number(value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

export function EmptyBox({ text = '暂无数据' }) {
  return <Empty description={text} style={{ padding: 40 }} />;
}

export const fmtTime = (t) => (t ? new Date(t).toLocaleString('zh-CN') : '-');
