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

### 2. 配置环境变量

创建 `.env` 文件：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-api-key
SUPABASE_BUCKET=excel-files
```

### 3. 运行服务器

```bash
python main.py
```

API 文档地址：`http://localhost:5000/`

## 📡 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| `POST` | `/api/v1/files` | 上传 Excel 文件到 Supabase 存储桶 |
| `GET` | `/api/v1/files/<file_id>` | 获取文件信息 |
| `DELETE` | `/api/v1/files/<file_id>` | 删除文件 |
| `POST` | `/api/v1/execute/<file_id>` | **核心端点** - 填充输入 → Excel 计算 → 返回输出 |
| `GET` | `/api/v1/read/<file_id>` | 读取特定单元格 |
| `PUT` | `/api/v1/write/<file_id>` | 写入特定单元格 |
| `GET` | `/api/v1/sheets/<file_id>` | 获取工作表列表 |

## 💡 使用示例

### 上传 Excel 文件

```bash
curl -X POST http://localhost:5000/api/v1/files \
  -F "file=@salary_calc.xlsx"
```

响应：
```json
{
  "success": true,
  "data": {
    "file_id": "550e8400-e29b-41d4-a716-446655440000.xlsx",
    "filename": "550e8400-e29b-41d4-a716-446655440000.xlsx",
    "original_filename": "salary_calc.xlsx",
    "url": "https://..."
  }
}
```

### 执行计算（核心功能）

假设 Excel 文件结构：
- `C11` = 输入 (基本工资)
- `C12` = 输入 (税率)
- `C13` = 公式 `=SUM(C11,C12)` (税后工资)

```bash
curl -X POST http://localhost:5000/api/v1/execute/550e8400-e29b-41d4-a716-446655440000.xlsx \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {"cell": "C11", "value": 5000},
      {"cell": "C12", "value": 0.15}
    ],
    "outputs": ["C13"]
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": {
      "C13": 5750
    },
    "file_id": "550e8400-e29b-41d4-a716-446655440000.xlsx",
    "sheet": "Sheet1"
  }
}
```

### 读取单元格

```bash
curl "http://localhost:5000/api/v1/read/file-id?cells=A1,C13,D15"
```

### 写入单元格

```bash
curl -X PUT http://localhost:5000/api/v1/write/file-id \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"cell": "A1", "value": "新值"},
      {"cell": "B2", "value": 100}
    ]
  }'
```

## 🏗️ 项目结构

```
excel-processor/
├── backend/
│   ├── api/
│   │   └── endpoints.py      # API 路由
│   ├── models/
│   │   └── schemas.py        # Pydantic 模型
│   └── services/
│       ├── bucket_service.py # Supabase 存储服务
│       └── excel_service.py   # Excel 操作服务
├── excel_processor/          # 原有的 Excel 处理模块
│   ├── file_reader.py
│   ├── file_editor.py
│   ├── errors.py
│   └── validators.py
├── tests/                    # 单元测试
├── main.py                   # 应用入口
└── requirements.txt
```

## 🔧 技术栈

- **后端：** Flask, Python
- **存储：** Supabase (Buckets)
- **Excel 处理：** openpyxl, xlrd
- **验证：** Pydantic

## 👨‍💻 开发者

- **GitHub:** [@islamahmedas12-ux](https://github.com/islamahmedas12-ux)

## 📄 许可证

MIT License

---

**让 Excel 成为您的后端！** 🎉