# Word文档批注系统

这是一个基于Flask的Word文档批注系统，可以从Excel文件中读取批注数据，并将其插入到Word文档中。

## 功能特性

- 支持.doc和.docx格式的Word文档
- 从Excel文件中读取批注数据
- 自动将.doc文件转换为.docx格式
- 自动保存转换后的docx文件到save-word目录
- 智能文本匹配，支持跨段落和模糊匹配
- 生成带有批注的Word文档

## 安装要求

### 系统要求
- Python 3.7+
- LibreOffice (用于.doc文件转换)

### Python依赖
```bash
pip install -r requirements.txt
```

### LibreOffice安装
- Windows: 从 [LibreOffice官网](https://www.libreoffice.org/download/download/) 下载并安装
- 默认安装路径: `C:\Program Files\LibreOffice\program\soffice.exe`

## 使用方法

1. 启动应用：
```bash
python app.py
```

2. 打开浏览器访问：`http://localhost:5000`

3. 上传文件：
   - Word文档：支持.doc和.docx格式
   - Excel文件：包含批注数据的.xlsx文件

4. 系统会自动处理文件并生成带有批注的Word文档

## 文件保存

### 转换后的docx文件
- 所有从.doc转换的.docx文件都会自动保存到 `save-word/` 目录
- 文件名格式：`converted_原文件名.docx`
- 如果文件已存在，会自动添加时间戳避免覆盖
- 支持多种转换方法：
  - LibreOffice转换：`converted_原文件名.docx`
  - 备用转换：`converted_原文件名_backup.docx`
  - mammoth转换：`converted_原文件名_mammoth.docx`
  - python-docx直接转换：`converted_原文件名_direct.docx`

### 目录结构
```
word-api/
├── app.py                 # 主应用文件
├── uploads/              # 上传文件目录
├── save-word/            # 转换后的docx文件保存目录
├── templates/            # HTML模板
└── requirements.txt      # Python依赖
```

## 文件格式要求

### Excel文件格式
- 第一列：要批注的原文
- 第二列：批注内容
- 至少包含两列数据

### Word文档
- 支持.doc和.docx格式
- 系统会自动将.doc转换为.docx进行处理

## 转换方法

系统使用多种方法进行.doc到.docx的转换：

1. **LibreOffice转换**（主要方法）
   - 使用LibreOffice命令行工具
   - 生成格式规范的docx文件
   - 保持原始文档格式

2. **备用转换方法**
   - mammoth库转换
   - python-docx直接读取
   - docx2txt文本提取后重建

## 文本匹配策略

系统使用三层匹配策略：

1. **精确匹配**：在单个段落内查找完整文本
2. **跨运行匹配**：处理文本被分割到多个运行的情况
3. **模糊匹配**：使用相似度算法进行模糊匹配

## 故障排除

### 常见问题

1. **LibreOffice未找到**
   - 确保LibreOffice已正确安装
   - 检查安装路径是否正确

2. **转换失败**
   - 检查文档是否损坏
   - 尝试使用不同的转换方法

3. **文本匹配失败**
   - 检查Excel中的文本是否与Word文档中的文本完全一致
   - 系统会自动尝试模糊匹配

### 调试信息

系统会输出详细的调试信息，包括：
- 转换过程日志
- 文档结构分析
- 文本匹配结果
- 错误详情

## 技术架构

- **后端**：Flask
- **文档处理**：python-docx, lxml
- **文件转换**：LibreOffice, mammoth, docx2txt
- **文本匹配**：difflib, 正则表达式
- **数据解析**：pandas

## 许可证

MIT License

## 项目简介
本项目实现了基于 Excel 文件内容，自动批量插入批注到 Word 文档的自动化处理。支持 .doc/.docx 文件，未能匹配的批注会自动插入到文档最后一页新段落，便于人工后续处理。

## 主要功能
- 上传 Word（.doc/.docx）和 Excel（.xlsx）文件，自动将 Excel 批注插入到 Word。
- 支持 .doc 文件自动转换为 .docx。
- 未能匹配的批注会在文档最后一页新段落以"【未成功匹配】"特殊标记插入。
- 只保留处理后的带批注文档，自动清理原始上传和中间文件。
- 提供 Flask Web API（app.py）和独立处理脚本（api/w-api.py）两种用法。
- 但是建议上传 .docx 格式的文件，.docx 格式的文件在本系统更加稳定。

## 使用方法
### 1. 运行 Web 服务
```bash
python app.py
```
- 访问 http://localhost:5000 上传 Word 和 Excel 文件。
- 处理完成后可下载带批注的 Word 文档。

### 2. 独立脚本处理
可直接调用 `api/w-api.py` 中的 `process_docx_file(docx_path)` 进行批注插入。

### 3. Excel 文件格式要求
- 必须为 .xlsx 文件。
- 前两列分别为"原文"和"批注"。

## 依赖环境
- Python 3.8+
- Flask
- lxml
- pandas
- python-docx
- LibreOffice（如需 .doc 转 .docx）
- Libreoffice下载地址：https://www.libreoffice.org/download
- app.py 中的第35行需要修改为自己的下载路径。

安装依赖：
```bash
pip install flask lxml pandas python-docx
```

## 注意事项
- Excel 文件需两列：原文、批注。
- Word 文件需为 .doc 或 .docx。
- 未匹配的批注会在文档最后一页新段落以"【未成功匹配】"标记插入。
- 处理后只保留带批注的文档，原始文件自动清理。
- 若需 .doc 转换，需本地安装 LibreOffice 并配置好路径。

## 示例接口说明
- Web 上传接口：`/upload_file`，POST，表单字段 `word_file`、`excel_file`
- 处理成功返回：`{"message": "文件处理成功", "output_file": "output_xxx.docx"}`

## 目录结构
```
word-api/
  app.py                # 主Web服务，批注插入主逻辑
  api/w-api.py          # 独立批注插入脚本
  uploads/              # 上传和输出文件目录
  README.md             # 项目说明
```

## 联系方式
如有问题请联系开发者。 