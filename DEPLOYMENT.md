# 部署说明 (Deployment Guide)

本项目是一个飞书多维表格插件，用于将人名批量转换为人员类型。

## 环境要求
- Node.js 20.x 或更高版本
- Nginx (用于 HTTPS 转发)
- PM2 (用于进程守护)

## 快速部署步骤

### 1. 克隆代码
```bash
git clone https://github.com/yigeiwo/mostly-table-personnel-.git
cd mostly-table-personnel-
```

### 2. 安装依赖并构建
```bash
npm install
npm run build
```

### 3. 使用 PM2 运行预览服务
```bash
# 使用 vite preview 启动服务，端口 3000
pm2 start "npm run preview" --name lark-plugin
```

### 4. Nginx 配置 (HTTPS)
由于飞书插件要求必须使用 HTTPS，建议使用 Nginx 进行反向代理。

示例配置 (`/etc/nginx/sites-available/goo.ppzh.xyz`):
```nginx
server {
    listen 80;
    server_name goo.ppzh.xyz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name goo.ppzh.xyz;

    ssl_certificate /etc/letsencrypt/live/goo.ppzh.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/goo.ppzh.xyz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Vite 配置注意事项
确保 `vite.config.ts` 中的 `preview.allowedHosts` 包含了你的域名：
```typescript
preview: {
  host: '0.0.0.0',
  port: 3000,
  strictPort: true,
  allowedHosts: ['goo.ppzh.xyz']
}
```

## 飞书后台配置
1. 进入飞书开放平台 -> 应用详情 -> 网页。
2. 配置 H5 域名为 `https://goo.ppzh.xyz`。
3. 在多维表格中添加插件，地址填入 `https://goo.ppzh.xyz`。
