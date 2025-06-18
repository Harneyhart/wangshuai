# Word 批量批注自动插入系统

## 项目简介
本项目实现了基于 Excel 文件内容，自动批量插入批注到 Word 文档的自动化处理。支持 .doc/.docx 文件，未能匹配的批注会自动插入到文档最后一页新段落，便于人工后续处理。

## 主要功能
- 上传 Word（.doc/.docx）和 Excel（.xlsx）文件，自动将 Excel 批注插入到 Word。
- 支持 .doc 文件自动转换为 .docx。
- 未能匹配的批注会在文档最后一页新段落以“【未成功匹配】”特殊标记插入。
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
- 前两列分别为“原文”和“批注”。

## 依赖环境
- Python 3.8+
- Flask
- lxml
- pandas
- python-docx
- LibreOffice（如需 .doc 转 .docx）

安装依赖：
```bash
pip install flask lxml pandas python-docx
```

## 注意事项
- Excel 文件需两列：原文、批注。
- Word 文件需为 .doc 或 .docx。
- 未匹配的批注会在文档最后一页新段落以“【未成功匹配】”标记插入。
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