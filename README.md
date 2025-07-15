<<<<<<< HEAD
# Schwann

## 本地开发

### 配置文件

```bash
cp .env.example .env.local
```

### 启动项目

使用：`pnpm`

```bash
pnpm install

pnpm dev
```

### 数据库改动

```bash
# 生成 migrate 文件
pnpm db:generate

# 执行 migrate
pnpm db:migrate
```

### 目录结构

```bash
app/
  api/           // 后端接口
  template.tsx   // 浏览器渲染的公共模板
  actions.tsx    // 公共方法，可代替后端接口
lib/
  db/
    schema.ts    // 数据库结构
utils/
  query.ts       // 数据库查询语句
```

### 测试请求

```
curl http://localhost:3000/api/demo/notes

curl -d '{"title": "abc", "text": "2123"}' -H "Content-Type: application/json" -X POST http://localhost:3000/api/demo/notes
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
