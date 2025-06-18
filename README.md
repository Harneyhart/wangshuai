# Word-API 批注自动插入系统

## 简介
本系统是一个基于 Flask 的 Web 应用，支持用户上传 Word 文档（.doc/.docx）和 Excel 批注文件（.xlsx），自动将 Excel 中的批注内容插入到 Word 文档的指定位置，并支持标准化文档结构，兼容中英文合同。

## 主要功能
- 支持 .doc 和 .docx 格式的 Word 文档自动批注
- 支持 Excel (.xlsx) 批注内容批量插入
- 文档自动标准化（分条款、加样式、复制表格），提升 AI/NLP 处理效果
- 支持批注插入后输出为 docx 或 doc 格式（自动转换）
- 兼容中文合同、英文合同、标准化与非标准化文档

## 依赖环境
- Python 3.7+
- Flask
- python-docx
- lxml
- pandas
- openpyxl
- LibreOffice（用于 doc/docx 互转，需本地安装）

## 安装方法
1. 克隆代码仓库：
   ```bash
   git clone <your-repo-url>
   cd word-api
   ```
2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
   或手动安装：
   ```bash
   pip install flask python-docx lxml pandas openpyxl
   ```
3. 确保本地已安装 LibreOffice，并配置好环境变量。

## 运行方法
```bash
python app.py
```
默认在 http://127.0.0.1:5000/ 启动服务。

## 使用说明
1. 打开 Web 页面，上传 Word 文档（.doc/.docx）和 Excel 批注文件（.xlsx）。
2. 系统自动：
   - 如果是 .doc，先转为 .docx
   - 对文档进行标准化（分条款、加样式、复制表格）
   - 插入 Excel 批注内容
   - 输出与上传文件名相关的结果文件（如 `CDAout.doc`、`MSAout.docx`）
3. 下载处理后的 Word 文件。

## 批注 Excel 文件格式
- 第一列：要插入批注的原文内容
- 第二列：批注内容
- 示例：
  | 原文 | 批注 |
  |------|------|
  | 第一条 | 这是批注 |

## 常见问题
- **doc 文件损坏/乱码？**
  - 请确保上传的 doc 文件为标准 Word 97-2003 格式，系统会自动转换。
- **批注未插入？**
  - 请确保 Excel 批注内容与 Word 文档内容完全匹配。
- **中文合同结构混乱？**
  - 系统已集成自动标准化，建议尽量使用标准条款、表格、样式。
- **LibreOffice 未安装？**
  - 请在本地安装 LibreOffice 并配置好环境变量。

## 目录结构
```
word-api/
  ├── app.py                # 主程序入口
  ├── api/w-api.py          # 辅助批注插入API
  ├── templates/            # 前端页面模板
  ├── uploads/              # 上传与输出文件目录
  ├── requirements.txt      # 依赖包列表
  └── README.md             # 项目说明
```

## 联系方式
如有问题或建议，请联系开发者。 