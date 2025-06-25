# AI Word 文档批注系统

## 项目简介
本项目是一个基于Flask的Web服务，支持上传Word文档和Excel批注表，自动对Word文档内容进行AI智能批注。系统支持多级标题区块划分、上下文感知批注、表格和普通段落自动归类，适用于合同、报告等多种文档场景。

## 主要功能
- 支持上传Word（.doc/.docx）和Excel（.xlsx）文件
- 自动识别多级标题，仅在内容段落插入批注
- 上下文感知批注匹配，错误精准定位
- 支持表格、无标题文档等多种结构
- 支持批注内容类型识别（如日期、数字、名称等错误）
- 输出带批注的Word文档

## 依赖安装
请确保已安装Python 3.7及以上版本。

```bash
pip install -r requirements.txt
```

**注意：**
- `.doc`格式转换依赖本地安装 [LibreOffice](https://www.libreoffice.org/)。
- Windows下需保证 `C:\Program Files\LibreOffice\program\soffice.exe` 路径存在。
- 需要将app.py中的第26行改为自己的DeepSeek-API-KEY。

## 使用方法
1. 启动服务：
   ```bash
   python app.py
   ```
2. 访问 `http://localhost:5000`，上传Word和Excel文件。
3. 下载带AI批注的Word文档。

### Excel批注表格式
- 第一列：需检查的原文或关键词
- 第二列：批注内容

## 目录结构
- `app.py`         主程序
- `uploads/`       下载文件目录
- `save-word/`     转换/中间文件目录
- `templates/`     网页模板

## 常见问题
- LibreOffice未安装或路径不对会导致.doc文件无法转换。
- DeepSeek等AI接口需保证网络可用。
