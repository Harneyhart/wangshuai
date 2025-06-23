# AI Word 文档批注系统

这是一个基于 Flask 的 Web 应用程序，它使用大语言模型（DeepSeek）为 Word 文档智能添加批注。

## 功能特性

-   **AI 驱动的匹配**：系统不再使用简单的文本搜索，而是通过 DeepSeek API 理解文档段落的语义，从而找到最相关的批注进行应用。
-   **智能批注定位**：AI 不仅能为段落找到最合适的批注，还能识别出该批注在段落中具体对应的文本片段，确保了高精度的批注。
-   **动态生成批注内容**：最终文档中批注栏显示的内容是 AI 生成的"匹配原因"，为用户提供了极具价值的上下文信息。
-   **Web 交互界面**：提供一个简单的 Flask UI，方便用户上传 Word 文档和 Excel 文件。
-   **广泛的文件支持**：能够处理 `.docx` 和 `.doc` 格式的文件（后者需要安装 LibreOffice 以进行自动格式转换）。

## 系统要求

1.  **Python 3.8+**
2.  **LibreOffice**：用于将 `.doc` 文件转换为 `.docx`。
    -   请从 [LibreOffice 官网](https://www.libreoffice.org/download/download/) 下载并安装。
    -   本应用默认的程序路径为 `C:\Program Files\LibreOffice\program\soffice.exe`。如果您的安装路径不同，请在 `app.py` 文件中进行修改。
3.  **DeepSeek API 密钥**：您必须拥有一个 [DeepSeek](https://platform.deepseek.com/) 平台的 API 密钥。
4. 在app.py的第30行修改为您的 Deepseek 密钥。

## 安装与配置

1.  **克隆代码仓库：**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **安装 Python 依赖：**
    ```bash
    pip install -r requirements.txt
    ```

3.  **配置 API 密钥：**
    -   打开 `app.py` 文件。
    -   找到 `DEEPSEEK_API_KEY = 'sk-...'` 这一行。
    -   将占位符替换为您自己的 DeepSeek API 密钥。

## 使用方法

1.  **运行应用程序：**
    ```bash
    python app.py
    ```

2.  **访问 Web 界面：**
    -   打开您的浏览器并访问 `http://127.0.0.1:5000`。

3.  **准备您的文件：**
    -   **Word 文档**：一个您希望添加批注的 `.doc` 或 `.docx` 文件。
    -   **Excel 文件 (`.xlsx`)**：一个包含候选批注列表的文件。
        -   系统只会读取该 Excel 文件的**第二列**。
        -   这一列应包含所有可供 AI 在分析文档时选择的批注。第一列的内容将会被忽略。

4.  **上传并处理：**
    -   使用网页上的表单上传您的 Word 文档和 Excel 文件。
    -   系统将会逐段处理文档，通过 AI 选择并放置最相关的批注。
    -   处理完成后，系统会提示您下载已添加批注的 `.docx` 文件。

## 技术工作流

1.  **文件上传**：用户上传一个 Word 文档和一个 Excel 文件。
2.  **`.doc` 转换**（如果需要）：如果上传的是 `.doc` 文件，系统会调用 LibreOffice 将其转换为 `.docx`。
3.  **段落遍历**：系统读取 `.docx` 文件并逐一遍历其中的文本段落。
4.  **AI 匹配**：对于每个段落，系统向 DeepSeek 发送一个 API 请求。请求中包含了该段落的文本以及从 Excel 文件第二列读取的完整候选批注列表。
5.  **AI 响应**：AI 返回一个 JSON 对象，其中包含：
    -   最佳匹配的批注。
    -   该批注应附着在段落中的具体文本。
    -   它做出该选择的原因。
6.  **XML 操作**：系统使用 `lxml` 库直接操作 `.docx` 文件中的 `document.xml`。它找到 AI 指定的精确文本，并用 `commentRangeStart` 和 `commentRangeEnd` 标签将其包裹起来。
7.  **生成批注**：AI 返回的 `reasoning` (原因) 文本将被作为批注内容添加到 `comments.xml` 文件中。
8.  **文件重打包**：修改后的 XML 文件被重新打包成一个新的 `.docx` 文件，并提供给用户下载。

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