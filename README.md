# Word Document Comment System

这是一个基于 Flask 的 Web 应用程序，用于自动为 Word 文档添加批注。该应用程序可以：
- 接收 Word 文档（.doc 或 .docx）和 Excel 文件
- 从 Excel 文件中读取批注信息
- 将批注自动添加到 Word 文档中
- 支持 .doc 到 .docx 的自动转换

## 系统要求

- Python 3.8 或更高版本
- LibreOffice（用于 .doc 到 .docx 的转换）

## 安装步骤

1. 克隆仓库：
```bash
git clone [repository-url]
cd word-api
```

2. 创建并激活虚拟环境（可选但推荐）：
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 运行应用：
```bash
python app.py
```

## 使用说明

1. 打开浏览器访问 `http://localhost:5000`
2. 上传 Word 文档和包含批注信息的 Excel 文件
3. 系统会自动处理文件并返回带有批注的新文档

## 注意事项

- Excel 文件必须至少包含两列：原文和批注
- 确保已安装 LibreOffice 以支持 .doc 文件的转换
- 上传的文件会临时存储在 `uploads` 目录中 