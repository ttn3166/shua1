# 后台开发规范（Admin Dev Spec）

## 目录结构规范
- `/admin-*.html`：后台页面模板（仅承载布局与页面入口）
- `/js/admin-*.js`：后台页面逻辑脚本
- `/css/admin-layout.css`：后台通用布局、表格、按钮样式

## 页面模板规范
所有后台页面（除登录页）必须包含如下结构，并使用绝对路径：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>页面标题</title>
  <link rel="stylesheet" href="/css/admin-layout.css" />
</head>
<body class="admin-page" data-page="users">
  <main id="app"></main>

  <script src="/js/admin-auth.js"></script>
  <script src="/js/admin-layout.js"></script>
  <script src="/js/admin-xxx.js"></script>
</body>
</html>
```

如果页面暂未实现业务功能，仍需引入页面 JS，并展示“开发中”提示。

## 鉴权规范
- Token 存储键：`localStorage.admin_token`
- 用户信息存储键：`localStorage.admin_user`
- 未登录跳转：`/admin-login.html`
- 获取当前用户：`GET /api/auth/me`

### API 请求封装
使用 `adminAuth.apiFetch('/api/...')` 自动携带 `Authorization: Bearer <token>`，统一处理错误与 401。

## 接口调用规范
- 请求/响应格式：`{ success, data }` 或 `{ success: false, error }`
- 所有失败必须在页面显示错误提示
- 所有关键操作必须要求填写 `reason`（原因）

## 权限与角色规范
- 前端按钮需要按角色做显示控制（至少隐藏无权限操作）
- 后端权限校验为最终准入规则

## UI/交互规范
- 表格列表必须有：加载态、空态、错误态
- 操作成功后自动刷新列表
- 关键操作强制填写原因

## 日志与审计
- 关键动作后端会写入 `audit_logs`
- 前端应将操作结果明确展示

## 发布与验收清单
1. `/admin-login.html` 登录正常，登录后跳转 `/admin.html`
2. 菜单可跳转所有 `admin-*.html`
3. 充值/提现列表可拉取数据，审批操作可成功并刷新
4. 任务模板可新增/切换启用；实例可分配/更新/取消
5. 其他页面至少可打开且无 JS 报错
6. `/api/*` 反向代理正常，Nginx root 指向 `/www/wwwroot/185.39.31.27`
