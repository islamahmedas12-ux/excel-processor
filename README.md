# Excel Processor - Backend as a Service

**Excel as a Backend Service** - 让公司将他们的 Excel 文件变成强大的 API。

## 🎯 核心概念

许多公司有复杂的 Excel 文件（公式、宏、报表系统）。他们害怕迁移到新系统，因为：
- Excel 系统已经很完善
- 理解内部公式和逻辑的成本很高
- 开发新系统很昂贵

**我们的解决方案：** 让 Excel 自己成为后端！

```
Company: "我们有复杂的 Excel 薪资计算系统"
    ↓
上传 Excel 文件
    ↓
API: 更新输入单元格 → Excel 自动计算 → 读取输出结果
    ↓
开发者使用 API，不需要理解 Excel 内部逻辑
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行服务器

```bash
python main.py
```

API 文档地址：`http://localhost:5000/`

## 📡 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| `POST` | `/api/v1/execute` | **核心端点** - 上传 Excel + 填充输入 → 获取计算输出 |
| `POST` | `/api/v1/read` | 从 Excel 读取特定单元格 |
| `POST` | `/api/v1/write` | 写入单元格并获取更新后的文件 |
| `POST` | `/api/v1/sheets` | 获取工作表列表 |
| `POST` | `/api/v1/export/pdf` | 将 Excel 文件导出为 PDF |
| `GET` | `/api/v1/health` | 健康检查 |

## 💡 使用示例

### 执行计算（核心功能）

假设 Excel 文件结构：
- `C11` = 输入 (基本工资)
- `C12` = 输入 (税率)
- `C13` = 公式 `=SUM(C11,C12)` (税后工资)

使用 multipart/form-data 上传：

```bash
curl -X POST http://localhost:5000/api/v1/execute \
  -F "file=@salary_calc.xlsx" \
  -F "inputs={\"C11\": 5000, \"C12\": 750}" \
  -F "outputs=C13"
```

响应：
```json
{
  "success": true,
  "results": {
    "C13": 5750
  },
  "sheet": "Sheet1",
  "filename": "salary_calc.xlsx"
}
```

### 读取单元格

```bash
curl -X POST http://localhost:5000/api/v1/read \
  -F "file=@data.xlsx" \
  -F "cells=A1,C13,D15"
```

### 写入单元格

```bash
curl -X POST http://localhost:5000/api/v1/write \
  -F "file=@data.xlsx" \
  -F "updates={\"A1\": \"新值\", \"B2\": 100}"
```

## 🏗️ 项目结构

```
excel-processor/
├── backend/                     # Flask API 服务
│   ├── api/
│   │   ├── endpoints.py        # API 端点路由
│   │   ├── admin.py            # 管理后台 API
│   │   └── auth.py             # 认证 API
│   ├── services/               # 业务服务层
│   │   ├── auth_service.py     # 认证服务
│   │   ├── excel_service.py    # Excel 处理服务
│   │   ├── file_store.py       # 文件存储
│   │   ├── pdf_export_service.py
│   │   └── *.py                # 其他服务
│   ├── db.py                   # 数据库连接
│   └── models.py               # 数据模型
├── excel_processor/            # Excel 处理核心库
│   ├── api_service.py          # API 服务
│   ├── file_reader.py          # 读取 Excel
│   ├── file_editor.py          # 编辑 Excel
│   ├── errors.py               # 错误处理
│   └── validators.py           # 验证
├── frontend/                    # 用户前端 (React/Vite)
├── admin/                      # 管理后台 (React/Vite)
├── landing/                    # 落地页 (Next.js)
├── tests/                      # 测试
├── scripts/                    # 工具脚本
├── main.py                     # 应用入口
└── requirements.txt
```

### 服务架构

| 服务 | 描述 | 端口 |
|------|------|------|
| `backend` | Flask API 服务 | 5000 |
| `frontend` | 用户界面 | 3000 |
| `admin` | 管理后台 | 3100 |
| `landing` | 营销落地页 | 4200 |
| `postgres` | PostgreSQL 数据库 | 5433 |
| `minio` | S3 兼容对象存储 | 9100 |

## 🔧 技术栈

- **后端：** Flask, Python
- **Excel 处理：** openpyxl, xlrd
- **CORS：** flask-cors

## 👨‍💻 开发者

- **GitHub:** [@islamahmedas12-ux](https://github.com/islamahmedas12-ux)

## 📄 许可证

MIT License

---

**让 Excel 成为您的后端！** 🎉