# Excel Processor - Documentation Index

**Excel as a Backend Service** - 让公司将他们的 Excel 文件变成强大的 API。

本目录包含 Excel Processor 项目的完整架构文档体系。

## 📚 文档索引

| 文档 | 描述 |
|------|------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 系统概览、服务连接、API 端点 |
| **[DATA_FLOW.md](DATA_FLOW.md)** | 数据存储架构（Postgres vs MinIO vs 内存） |
| **[AUTHENTICATION.md](AUTHENTICATION.md)** | JWT 跨服务认证流程 |
| **[ASYNC_JOBS.md](ASYNC_JOBS.md)** | 后台异步任务处理系统 |
| **[ADMIN_PORTAL.md](ADMIN_PORTAL.md)** | Admin 门户与后端集成 |

## 🗂️ 文档导航

### 新手入门
1. 阅读 [ARCHITECTURE.md](ARCHITECTURE.md) 了解系统整体架构
2. 查看 [DATA_FLOW.md](DATA_FLOW.md) 理解数据存储方式
3. 参考主项目 [README.md](../README.md) 运行服务

### 开发者指南

#### 认证与安全
- [AUTHENTICATION.md](AUTHENTICATION.md) — JWT 认证、登录流程、角色权限

#### 后台任务
- [ASYNC_JOBS.md](ASYNC_JOBS.md) — 异步任务队列、PDF 导出、任务管理

#### 管理功能
- [ADMIN_PORTAL.md](ADMIN_PORTAL.md) — 用户管理、订阅管理、计划管理

### 数据架构

```
PostgreSQL (元数据)
    ├── 用户账户
    ├── 订阅信息
    ├── 异步任务状态
    └── 模板定义

MinIO (对象存储)
    ├── Excel 文件仓库
    ├── 计算结果
    ├── 生成 PDF
    └── 用户头像

内存存储 (临时)
    └── 短期文件暂存
```

详细说明请参考 [DATA_FLOW.md](DATA_FLOW.md)。

## 🔗 快速链接

### 核心服务
| 服务 | 端口 | 描述 |
|------|------|------|
| Backend | 5000 | Flask API 服务器 |
| Frontend | 3000 | 用户 Web 应用 |
| Admin | 3100 | 管理员门户 |
| Landing | 4200 | 营销落地页 |
| PostgreSQL | 5433 | 关系型数据库 |
| MinIO | 9100 | S3 兼容对象存储 |

### 主要 API 端点
| 方法 | 端点 | 描述 |
|------|------|------|
| `POST` | `/api/v1/execute` | 执行 Excel 计算 |
| `POST` | `/api/v1/read` | 读取单元格 |
| `POST` | `/api/v1/write` | 写入单元格 |
| `POST` | `/api/v1/files` | 上传文件 |
| `POST` | `/api/v1/jobs` | 创建异步任务 |
| `GET` | `/api/v1/admin/stats` | 系统统计（需 admin 权限） |

## 📖 文档更新指南

更新架构文档时请遵循以下原则：

1. **保持文档同步** — 代码变更后及时更新对应文档
2. **使用中文** — 文档标题和关键说明使用中文
3. **包含示例** — 重要的 API 调用包含 curl/代码示例
4. **链接交叉** — 文档之间使用相对链接互相引用

## 🛠️ 项目结构

```
excel-processor/
├── backend/              # Flask API 后端
│   ├── api/             # API 路由
│   ├── services/        # 业务逻辑服务
│   ├── db.py           # 数据库配置
│   └── models.py       # 数据模型
├── excel_processor/     # Excel 处理核心模块
├── frontend/           # 用户前端 React 应用
├── admin/              # Admin 管理门户
├── landing/            # Next.js 落地页
├── docs/               # 架构文档目录
│   ├── README.md       # 文档索引（本文件）
│   ├── ARCHITECTURE.md # 系统架构
│   ├── DATA_FLOW.md    # 数据流文档
│   ├── AUTHENTICATION.md # 认证文档
│   ├── ASYNC_JOBS.md   # 异步任务文档
│   └── ADMIN_PORTAL.md # Admin 门户文档
├── docker-compose.yml   # 容器编排
└── requirements.txt    # Python 依赖
```

## 👨‍💻 开发者

- **GitHub:** [@islamahmedas12-ux](https://github.com/islamahmedas12-ux)

## 📄 许可证

MIT License

---

**让 Excel 成为您的后端！** 🎉
