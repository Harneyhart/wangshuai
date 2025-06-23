import io
import os
import shutil
import zipfile
import pandas as pd
from flask import Flask, request, send_file, render_template, redirect, url_for, flash, jsonify
from lxml import etree
from lxml.etree import QName
import difflib
import re
import subprocess
import tempfile
import sys
from docx import Document
from werkzeug.utils import secure_filename
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import uuid
import importlib.util
import datetime

app = Flask(__name__)
app.secret_key = 'replace-with-your-own-secret'

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
def W(tag): return f"{{{W_NS}}}{tag}"

# 模糊文本匹配函数
def find_best_text_match(target_text, document_text, threshold=0.7):
    """
    使用模糊匹配查找最相似的文本
    :param target_text: 要查找的文本
    :param document_text: 文档中的文本
    :param threshold: 相似度阈值 (0.0-1.0)
    :return: (匹配的文本, 相似度, 开始位置, 结束位置) 或 None
    """
    if not target_text or not document_text:
        return None
    
    # 方法1：直接匹配
    if target_text in document_text:
        start_pos = document_text.find(target_text)
        return (target_text, 1.0, start_pos, start_pos + len(target_text))
    
    # 方法2：模糊匹配
    # 将文档文本分割成可能的候选片段
    words = target_text.split()
    if len(words) <= 1:
        return None
    
    # 尝试不同长度的片段
    for length in range(len(words), max(2, len(words) // 2), -1):
        for start in range(len(words) - length + 1):
            candidate = ' '.join(words[start:start + length])
            
            # 使用difflib进行模糊匹配
            matcher = difflib.SequenceMatcher(None, candidate, document_text)
            best_match = matcher.find_longest_match(0, len(candidate), 0, len(document_text))
            
            if best_match.size > 0:
                matched_text = candidate[best_match.a:best_match.a + best_match.size]
                similarity = best_match.size / len(candidate)
                
                if similarity >= threshold:
                    doc_start = best_match.b
                    doc_end = best_match.b + best_match.size
                    return (matched_text, similarity, doc_start, doc_end)
    
    return None

# 清理和标准化文本
def normalize_text(text):
    """
    清理和标准化文本，去除多余空格和换行
    """
    if not text:
        return ""
    # 去除多余空格和换行
    text = re.sub(r'\s+', ' ', text.strip())
    return text

# 确保上传目录存在
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保保存目录存在
SAVE_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'save-word')
if not os.path.exists(SAVE_FOLDER):
    os.makedirs(SAVE_FOLDER)
app.config['SAVE_FOLDER'] = SAVE_FOLDER

# 查找并返回本地LibreOffice的可执行文件路径，如果未安装则抛出异常。
def find_libreoffice():
    """查找 LibreOffice 可执行文件路径"""
    soffice_path = r"C:\Program Files\LibreOffice\program\soffice.exe"
    if not os.path.exists(soffice_path):
        raise Exception("未找到 LibreOffice，请确保已安装 LibreOffice")
    return soffice_path

# 使用docx2txt库将.doc文件内容读取出来，并生成新的.docx文件作为备用转换方法。
def convert_doc_to_docx_alternative(doc_path):
    """备用的.doc转换方法，尝试生成格式规范的docx"""
    try:
        # 方法1：尝试使用mammoth库（如果可用）
        try:
            import mammoth
            print("尝试使用mammoth库转换...")
            
            # mammoth主要用于docx到html的转换，但也可以尝试doc转换
            with open(doc_path, "rb") as docx_file:
                result = mammoth.convert_to_html(docx_file)
                html_content = result.value
                
                if html_content and len(html_content.strip()) > 0:
                    print(f"mammoth提取到HTML内容，长度: {len(html_content)}")
                    
                    # 将HTML转换为docx
                    from docx import Document
                    from bs4 import BeautifulSoup
                    
                    # 解析HTML
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    # 创建新的docx文档
                    doc = Document()
                    
                    # 处理段落
                    for p_tag in soup.find_all(['p', 'div']):
                        if p_tag.get_text().strip():
                            p = doc.add_paragraph(p_tag.get_text().strip())
                    
                    # 如果没有找到段落，尝试处理所有文本
                    if len(doc.paragraphs) == 0:
                        text = soup.get_text()
                        if text.strip():
                            doc.add_paragraph(text.strip())
                    
                    # 保存文档
                    temp_dir = tempfile.mkdtemp()
                    converted_file = os.path.join(temp_dir, f"{os.path.splitext(os.path.basename(doc_path))[0]}.docx")
                    doc.save(converted_file)
                    
                    # 将转换后的文件保存到save-word目录
                    save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_mammoth.docx"
                    save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
                    
                    # 如果文件已存在，添加时间戳
                    if os.path.exists(save_path):
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_mammoth_{timestamp}.docx"
                        save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
                    
                    # 复制文件到保存目录
                    shutil.copy2(converted_file, save_path)
                    print(f"✓ mammoth转换的docx文件已保存到: {save_path}")
                    
                    print(f"✓ mammoth转换成功，创建了 {len(doc.paragraphs)} 个段落")
                    return converted_file
                else:
                    print("mammoth提取的内容为空")
                    raise Exception("mammoth提取的内容为空")
                    
        except ImportError:
            print("mammoth库不可用，尝试其他方法")
        except Exception as e:
            print(f"mammoth转换失败: {e}")
        
        # 方法2：尝试使用python-docx直接读取（如果支持）
        try:
            from docx import Document
            # 注意：python-docx可能不支持直接读取.doc文件
            # 这里作为备用尝试
            doc = Document(doc_path)
            temp_dir = tempfile.mkdtemp()
            converted_file = os.path.join(temp_dir, f"{os.path.splitext(os.path.basename(doc_path))[0]}.docx")
            doc.save(converted_file)
            
            # 将转换后的文件保存到save-word目录
            save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_direct.docx"
            save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
            
            # 如果文件已存在，添加时间戳
            if os.path.exists(save_path):
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_direct_{timestamp}.docx"
                save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
            
            # 复制文件到保存目录
            shutil.copy2(converted_file, save_path)
            print(f"✓ python-docx直接转换的docx文件已保存到: {save_path}")
            
            print("✓ 使用python-docx直接转换成功")
            return converted_file
        except Exception as e:
            print(f"python-docx直接转换失败: {e}")
        
        # 方法3：使用docx2txt提取文本，然后创建格式规范的docx
        import docx2txt
        from docx import Document
        from docx.shared import Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        # 读取.doc文件内容
        text = docx2txt.process(doc_path)
        print(f"从doc文件提取的文本长度: {len(text)}")
        
        # 创建新的.docx文档
        doc = Document()
        
        # 改进的文本处理：尝试保持原始格式结构
        if text.strip():
            # 按段落分割（保持原始段落结构）
            paragraphs = text.split('\n\n')  # 双换行表示段落分隔
            if len(paragraphs) == 1:
                # 如果没有双换行，尝试单换行分割
                paragraphs = text.split('\n')
            
            print(f"识别到 {len(paragraphs)} 个段落")
            
            for para_text in paragraphs:
                para_text = para_text.strip()
                if para_text:
                    # 处理段落内的换行
                    lines = para_text.split('\n')
                    if len(lines) == 1:
                        # 单行段落
                        p = doc.add_paragraph(lines[0])
                    else:
                        # 多行段落，第一行作为段落开始
                        p = doc.add_paragraph(lines[0])
                        # 后续行添加到当前段落
                        for line in lines[1:]:
                            if line.strip():
                                p.add_run('\n' + line.strip())
        else:
            # 如果提取的文本为空，添加默认内容
            doc.add_paragraph("文档内容")
        
        # 保存到临时文件
        temp_dir = tempfile.mkdtemp()
        converted_file = os.path.join(temp_dir, f"{os.path.splitext(os.path.basename(doc_path))[0]}.docx")
        
        doc.save(converted_file)
        print(f"备用转换完成，创建的段落数: {len(doc.paragraphs)}")
        
        # 验证转换后的文件
        try:
            with zipfile.ZipFile(converted_file, 'r') as docx:
                file_list = docx.namelist()
                if 'word/document.xml' in file_list:
                    print("✓ 备用转换生成了有效的docx文件")
                    
                    # 将转换后的文件保存到save-word目录
                    save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_backup.docx"
                    save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
                    
                    # 如果文件已存在，添加时间戳
                    if os.path.exists(save_path):
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_backup_{timestamp}.docx"
                        save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
                    
                    # 复制文件到保存目录
                    shutil.copy2(converted_file, save_path)
                    print(f"✓ 备用转换的docx文件已保存到: {save_path}")
                    
                    return converted_file
                else:
                    print("⚠ 备用转换生成的文件格式不正确")
                    raise Exception("备用转换生成的文件格式不正确")
        except Exception as e:
            print(f"验证转换文件失败: {e}")
            raise Exception(f"备用转换验证失败: {str(e)}")
        
    except ImportError:
        raise Exception("备用转换方法需要安装相关库: pip install docx2txt beautifulsoup4 mammoth")
    except Exception as e:
        raise Exception(f"备用转换失败: {str(e)}")

# 使用LibreOffice将.doc文件转换为.docx格式，若失败则调用备用方法进行转换。
def convert_doc_to_docx(doc_path):
    """将 .doc 文件转换为 .docx 格式"""
    temp_dir = None
    try:
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        # 确保源文件存在
        if not os.path.exists(doc_path):
            raise Exception(f"源文件不存在: {doc_path}")
        
        print(f"开始转换doc文件: {doc_path}")
        print(f"临时目录: {temp_dir}")
        
        # 获取 LibreOffice 路径
        soffice_path = find_libreoffice()
        print(f"使用LibreOffice路径: {soffice_path}")
        
        # 使用更详细的LibreOffice转换命令
        cmd = [
            soffice_path,
            '--headless',
            '--convert-to', 'docx:Office Open XML Text',
            '--outdir', temp_dir,
            doc_path
        ]
        
        print(f"执行转换命令: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8', 
            errors='ignore',
            timeout=60  # 添加超时限制
        )
        
        print(f"转换命令返回码: {result.returncode}")
        if result.stdout:
            print(f"转换输出: {result.stdout}")
        if result.stderr:
            print(f"转换错误: {result.stderr}")
        
        # 检查转换结果
        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else "未知错误"
            print(f"LibreOffice转换失败，尝试备用方法: {error_msg}")
            return convert_doc_to_docx_alternative(doc_path)
            
        # 获取转换后的文件路径
        base_name = os.path.splitext(os.path.basename(doc_path))[0]
        converted_file = os.path.join(temp_dir, f"{base_name}.docx")

        # 验证转换后的文件
        if not os.path.exists(converted_file):
            print("转换后的文件不存在，检查临时目录内容:")
            # 列出临时目录中的所有文件
            for file in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file)
                if os.path.isfile(file_path):
                    print(f"  - {file} ({os.path.getsize(file_path)} bytes)")
                else:
                    print(f"  - {file} (目录)")
            print("LibreOffice转换失败，尝试备用方法")
            return convert_doc_to_docx_alternative(doc_path)
            
        print(f"转换后的文件大小: {os.path.getsize(converted_file)} bytes")
            
        # 智能验证文件格式
        print("验证转换后的文件格式...")
        try:
            with zipfile.ZipFile(converted_file, 'r') as docx:
                file_list = docx.namelist()
                print(f"docx文件内容: {file_list}")
                
                # 检查不同的文档格式
                if 'word/document.xml' in file_list:
                    print("✓ 转换为Office Open XML格式成功")
                    
                    # 进一步验证文档内容
                    try:
                        doc_content = docx.read('word/document.xml').decode('utf-8')
                        if '<w:body>' in doc_content and '</w:body>' in doc_content:
                            print("✓ 文档结构完整")
                            
                            # 检查是否有实际内容
                            if '<w:t>' in doc_content:
                                print("✓ 文档包含文本内容")
                            else:
                                print("⚠ 文档结构完整但可能没有文本内容")
                        else:
                            print("⚠ 文档结构不完整")
                    except Exception as e:
                        print(f"验证文档内容时出错: {e}")
                        
                elif 'content.xml' in file_list:
                    print("转换为OpenDocument格式，尝试备用方法")
                    return convert_doc_to_docx_alternative(doc_path)
                elif any(f.startswith('word/') for f in file_list):
                    print("✓ 转换为部分XML格式，可能可以处理")
                else:
                    # 检查是否有其他可能的文档结构
                    print("转换后的文件格式未知，检查是否有其他结构")
                    
                    # 解压文件检查结构
                    temp_check_dir = tempfile.mkdtemp()
                    try:
                        with zipfile.ZipFile(converted_file, 'r') as check_zip:
                            check_zip.extractall(temp_check_dir)
                        
                        # 检查解压后的结构
                        print(f"解压后的结构:")
                        for root, dirs, files in os.walk(temp_check_dir):
                            level = root.replace(temp_check_dir, '').count(os.sep)
                            indent = ' ' * 2 * level
                            print(f"{indent}{os.path.basename(root)}/")
                            subindent = ' ' * 2 * (level + 1)
                            for file in files:
                                print(f"{subindent}{file}")
                        
                        # 查找可能的文档文件
                        possible_docs = []
                        for root, dirs, files in os.walk(temp_check_dir):
                            for file in files:
                                if file.endswith('.xml') and any(keyword in file.lower() for keyword in ['document', 'content', 'text']):
                                    possible_docs.append(os.path.relpath(os.path.join(root, file), temp_check_dir))
                        
                        if possible_docs:
                            print(f"找到可能的文档文件: {possible_docs}")
                            print("✓ 文件结构可能可以处理")
                        else:
                            print("没有找到任何文档文件，尝试备用方法")
                            return convert_doc_to_docx_alternative(doc_path)
                            
                    finally:
                        shutil.rmtree(temp_check_dir)
                        
        except zipfile.BadZipFile:
            print("转换后的文件不是有效的ZIP文件，尝试备用方法")
            return convert_doc_to_docx_alternative(doc_path)
                
        print(f"✓ 转换成功: {converted_file}")
        
        # 将转换后的文件保存到save-word目录
        save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}.docx"
        save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
        
        # 如果文件已存在，添加时间戳
        if os.path.exists(save_path):
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            save_filename = f"converted_{os.path.splitext(os.path.basename(doc_path))[0]}_{timestamp}.docx"
            save_path = os.path.join(app.config['SAVE_FOLDER'], save_filename)
        
        # 复制文件到保存目录
        shutil.copy2(converted_file, save_path)
        print(f"✓ 转换后的docx文件已保存到: {save_path}")
        
        return converted_file
        
    except subprocess.TimeoutExpired:
        print("LibreOffice转换超时，尝试备用方法")
        return convert_doc_to_docx_alternative(doc_path)
    except Exception as e:
        # 清理临时文件
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"已清理临时目录: {temp_dir}")
            except:
                pass
        
        # 如果LibreOffice转换失败，尝试备用方法
        print(f"LibreOffice转换失败: {str(e)}，尝试备用方法")
        return convert_doc_to_docx_alternative(doc_path)

# Flask路由，渲染首页模板。
@app.route('/')
def index():
    return render_template('index.html')

# 创建一个指定名称的Word XML元素。
def create_element(name):
    """创建 XML 元素"""
    return OxmlElement(name)

# 为指定的XML元素设置属性。
def create_attribute(element, name, value):
    """设置 XML 元素属性"""
    element.set(qn(name), value)

# 在Word文档中查找指定文本，并在该文本处插入批注引用和批注内容。
def insert_comment(doc, text, comment_text):
    """在Word文档中插入批注"""
    try:
        # 获取当前文档中已有的批注数量，用于生成新的批注ID
        comment_id = str(len(doc._comments) + 1) if hasattr(doc, '_comments') else '1'
        
        # 遍历所有段落
        for paragraph in doc.paragraphs:
            if text in paragraph.text:
                # 找到包含目标文本的运行
                for run in paragraph.runs:
                    if text in run.text:
                        # 创建批注引用
                        comment_reference = create_element('w:commentReference')
                        create_attribute(comment_reference, 'w:id', comment_id)
                        
                        # 将批注引用直接插入到文本中
                        run._element.append(comment_reference)
                        
                        # 创建批注
                        comment = create_element('w:comment')
                        create_attribute(comment, 'w:id', comment_id)
                        create_attribute(comment, 'w:author', '批注系统')
                        create_attribute(comment, 'w:date', '2024-03-14T12:00:00Z')
                        create_attribute(comment, 'w:initials', 'PS')
                        
                        # 创建批注内容
                        p = create_element('w:p')
                        r = create_element('w:r')
                        t = create_element('w:t')
                        t.text = clean_comment_text(comment_text)
                        r.append(t)
                        p.append(r)
                        comment.append(p)
                        
                        # 初始化批注列表
                        if not hasattr(doc, '_comments'):
                            doc._comments = []
                        doc._comments.append(comment)
                        # 确保文档有comments部分
                        if not hasattr(doc._element, 'comments'):
                            comments = create_element('w:comments')
                            doc._element.append(comments)
                        else:
                            comments = doc._element.find(qn('w:comments'))
                            if comments is None:
                                comments = create_element('w:comments')
                                doc._element.append(comments)
                        # 添加批注到comments部分
                        comments.append(comment)
                        # 确保批注引用和批注内容正确关联
                        run._element.set(qn('w:commentReference'), comment_id)
                        
                        return True
        return False
    except Exception as e:
        raise Exception(f"插入批注时出错: {str(e)}")

# 从Excel文件中读取批注数据，要求Excel文件至少包含两列：原文和批注。
def read_comments_from_excel(excel_path):
    """从Excel文件中读取批注"""
    try:
        df = pd.read_excel(excel_path)
        if len(df.columns) < 2:
            raise Exception("Excel文件必须至少包含两列：原文和批注")
            
        comments = []
        for index, row in df.iterrows():
            if pd.notna(row[0]) and pd.notna(row[1]):  # 确保两列都有值
                comments.append({
                    'text': str(row[0]).strip(),
                    'comment': str(row[1]).strip()
                })
        return comments
    except Exception as e:
        raise Exception(f"读取Excel文件时出错: {str(e)}")

# Flask路由，处理文件上传请求，将Excel中的批注插入到Word文档中，并返回处理后的文档。
@app.route('/upload_file', methods=['POST'])
def upload_file():
    if 'word_file' not in request.files or 'excel_file' not in request.files:
        return jsonify({'error': '请上传Word文档和Excel文件'}), 400
    word_file = request.files['word_file']
    excel_file = request.files['excel_file']
    if word_file.filename == '' or excel_file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    if not word_file.filename.endswith(('.doc', '.docx')) or not excel_file.filename.endswith('.xlsx'):
        return jsonify({'error': '请上传正确的文件格式'}), 400
        
    try:
        # 保存上传的文件
        word_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(word_file.filename))
        excel_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(excel_file.filename))
        
        word_file.save(word_path)
        excel_file.save(excel_path)
        
        # 记录原始文件名（用于后续查找save-word中的文件）
        original_filename = os.path.splitext(word_file.filename)[0]
        original_extension = os.path.splitext(word_file.filename)[1]
        
        # 如果是 .doc 文件，先转换为 .docx 并保存到save-word目录
        docx_path_for_processing = word_path  # 默认使用原始文件路径
        if word_path.endswith('.doc'):
            print(f"开始转换.doc文件: {word_path}")
            converted_temp_path = convert_doc_to_docx(word_path)
            
            # 验证转换后的文件
            if not os.path.exists(converted_temp_path):
                raise Exception(f"转换后的文件不存在: {converted_temp_path}")
                
            # 验证文件格式
            try:
                with zipfile.ZipFile(converted_temp_path, 'r') as docx:
                    if 'word/document.xml' not in docx.namelist():
                        raise Exception("转换后的文件格式不正确，缺少document.xml")
            except Exception as e:
                raise Exception(f"转换后的文件格式验证失败: {str(e)}")
            
            # 查找save-word目录中对应的转换后文件
            print("查找save-word目录中的转换后文件...")
            save_word_files = []
            if os.path.exists(app.config['SAVE_FOLDER']):
                for file in os.listdir(app.config['SAVE_FOLDER']):
                    if file.startswith(f"converted_{original_filename}") and file.endswith('.docx'):
                        save_word_files.append(file)
            
            if save_word_files:
                # 使用最新的文件（按修改时间排序）
                save_word_files.sort(key=lambda x: os.path.getmtime(os.path.join(app.config['SAVE_FOLDER'], x)), reverse=True)
                latest_file = save_word_files[0]
                docx_path_for_processing = os.path.join(app.config['SAVE_FOLDER'], latest_file)
                print(f"使用save-word中的文件进行批注处理: {docx_path_for_processing}")
            else:
                print("警告: 在save-word目录中未找到转换后的文件，使用临时转换文件")
                docx_path_for_processing = converted_temp_path
        else:
            # 如果是.docx文件，直接使用
            print(f"使用原始docx文件: {word_path}")
            docx_path_for_processing = word_path
            
        # 读取Excel中的批注
        comments = read_comments_from_excel(excel_path)
        print("\n=== 从Excel读取到的批注 ===")
        for comment in comments:
            print(f"文本: {comment['text']}")
            print(f"批注: {comment['comment']}")
            print("---")
            
        # 保存修改后的文档
        output_base = 'output_' + os.path.splitext(os.path.basename(docx_path_for_processing))[0]
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_base + '.docx')
        
        # 检查输出文件是否已存在，如果存在则删除
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception as e:
                print(f"警告: 无法删除已存在的输出文件: {str(e)}")
                # 如果无法删除，使用新的文件名
                output_path = os.path.join(app.config['UPLOAD_FOLDER'], f'output_{uuid.uuid4()}.docx')
        
        # 确保输出目录存在且有写入权限
        try:
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            # 测试写入权限
            test_file = os.path.join(app.config['UPLOAD_FOLDER'], 'test_write.tmp')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
        except Exception as e:
            print(f"错误: 无法写入输出目录: {str(e)}")
            return jsonify({'error': '无法写入输出目录，请检查权限设置'}), 500
        
        try:
            # 第一步：复制用于处理的Word文件
            print(f"\n=== 第一步：复制Word文件用于批注处理 ===")
            print(f"源文件: {docx_path_for_processing}")
            copied_word_path = os.path.join(app.config['UPLOAD_FOLDER'], f'copied_{uuid.uuid4()}.docx')
            shutil.copy2(docx_path_for_processing, copied_word_path)
            print(f"Word文件已复制到: {copied_word_path}")
            # 第二步：调用w-api.py插入空批注
            print("\n=== 第二步：调用w-api.py插入空批注 ===")
            w_api_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api', 'w-api.py')
            if os.path.exists(w_api_path):
                try:
                    # 直接调用w-api.py中的处理函数，而不是启动Flask服务
                    spec = importlib.util.spec_from_file_location("w_api_module", w_api_path)
                    w_api_module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(w_api_module)
                    
                    # 调用处理函数
                    if hasattr(w_api_module, 'process_docx_file'):
                        w_api_module.process_docx_file(copied_word_path)
                        print("w-api.py 处理成功")
                    else:
                        print("警告: w-api.py 中没有找到 process_docx_file 函数")
                        # 即使没有找到函数，也继续执行后续步骤
                except Exception as e:
                    print(f"调用w-api.py时出错: {str(e)}")
                    # 即使出错，也继续执行后续步骤
            else:
                print(f"警告: w-api.py 文件不存在: {w_api_path}")
            
            # 第三步：添加Excel中的批注内容
            print("\n=== 第三步：添加Excel中的批注内容 ===")
            add_comments_to_docx_xml(copied_word_path, comments, output_path)
            print(f"\n文档已保存到: {output_path}")
            
            # 直接使用docx文件作为最终输出，不再转换为doc
            final_output_path = output_path
            print(f"✓ 最终输出文件: {final_output_path}")
            
            # 清理临时文件
            try:
                if os.path.exists(copied_word_path) and copied_word_path != output_path:
                    os.remove(copied_word_path)
            except Exception as e:
                print(f"警告: 清理复制的Word文件失败: {str(e)}")
            try:
                if os.path.exists(word_path) and word_path != output_path:
                    os.remove(word_path)
            except Exception as e:
                print(f"警告: 清理原始Word文件失败: {str(e)}")
            try:
                if os.path.exists(excel_path):
                    os.remove(excel_path)
            except Exception as e:
                print(f"警告: 清理Excel文件失败: {str(e)}")
            
            return jsonify({
                'message': '文件处理成功',
                'output_file': os.path.basename(final_output_path)
            })
            
        except Exception as e:
            print(f"\n=== 错误信息 ===")
            print(str(e))
            # 如果输出文件已存在，尝试删除
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
            return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        print(f"\n=== 错误信息 ===")
        print(str(e))
        return jsonify({'error': str(e)}), 500

# 清理批注文本中的特殊字符，确保XML格式正确，避免解析错误。
def clean_comment_text(text):
    """清理批注文本，确保特殊字符被正确转义"""
    return (text.replace("&", "&amp;")
               .replace("<", "&lt;")
               .replace(">", "&gt;")
               .replace('"', "&quot;")
               .replace("'", "&apos;"))

# 将Excel中的批注数据插入到docx文件的XML结构中，包括在正文中插入批注标记和在comments.xml中添加批注内容。
def add_comments_to_docx_xml(docx_path, comments, output_path):
    print(f"\n=== 开始处理docx文件 ===")
    print(f"输入文件: {docx_path}")
    print(f"输出文件: {output_path}")
    
    # 验证输入文件
    if not os.path.exists(docx_path):
        raise Exception(f"输入文件不存在: {docx_path}")
    
    # 智能验证文件格式
    file_format = None
    try:
        with zipfile.ZipFile(docx_path, 'r') as docx:
            file_list = docx.namelist()
            print(f"文件内容: {file_list}")
            
            # 检查不同的文档格式
            if 'word/document.xml' in file_list:
                file_format = 'office_open_xml'
                print("✓ 检测到Office Open XML格式")
            elif 'content.xml' in file_list:
                file_format = 'opendocument'
                print("✓ 检测到OpenDocument格式")
            elif any(f.startswith('word/') for f in file_list):
                file_format = 'partial_xml'
                print("✓ 检测到部分XML格式")
            else:
                file_format = 'unknown'
                print("⚠ 未知文件格式")
                
    except zipfile.BadZipFile:
        raise Exception("输入文件不是有效的ZIP文件")
    except Exception as e:
        raise Exception(f"文件格式验证失败: {str(e)}")
    
    # 如果是OpenDocument格式，需要转换
    if file_format == 'opendocument':
        print("检测到OpenDocument格式，需要转换为Office Open XML格式")
        # 这里可以添加转换逻辑，或者直接使用备用方法
        raise Exception("暂不支持OpenDocument格式，请使用Office Open XML格式的文档")
    # 如果是未知格式，尝试继续处理
    if file_format == 'unknown':
        print("警告: 未知文件格式，尝试继续处理")
    
    # 1. 解压 docx
    temp_dir = 'temp_docx_' + str(uuid.uuid4())
    os.makedirs(temp_dir, exist_ok=True)
    print(f"临时目录: {temp_dir}")
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        print("✓ 文件解压完成")
    except Exception as e:
        raise Exception(f"文件解压失败: {str(e)}")

    # 2. 解析 document.xml 和 comments.xml
    doc_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
    comments_xml_path = os.path.join(temp_dir, 'word', 'comments.xml')
    
    # 验证解压后的文件结构
    print(f"解压后的目录结构:")
    for root, dirs, files in os.walk(temp_dir):
        level = root.replace(temp_dir, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            print(f"{subindent}{file}")
    
    # 检查是否有word目录
    if not os.path.exists(os.path.join(temp_dir, 'word')):
        print("警告: 解压后没有word目录，尝试查找其他可能的文档结构")
        
        # 查找可能的文档文件
        possible_docs = []
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.endswith('.xml') and any(keyword in file.lower() for keyword in ['document', 'content', 'text']):
                    possible_docs.append(os.path.join(root, file))
        
        if possible_docs:
            print(f"找到可能的文档文件: {possible_docs}")
            # 使用第一个找到的文档文件
            doc_xml_path = possible_docs[0]
            # 创建word目录结构
            word_dir = os.path.join(temp_dir, 'word')
            os.makedirs(word_dir, exist_ok=True)
            # 移动文档文件到word目录
            new_doc_path = os.path.join(word_dir, 'document.xml')
            shutil.move(doc_xml_path, new_doc_path)
            doc_xml_path = new_doc_path
            print(f"已将文档文件移动到: {doc_xml_path}")
        else:
            # 如果没有找到任何XML文件，尝试创建基本的文档结构
            print("没有找到任何文档文件，创建基本结构")
            word_dir = os.path.join(temp_dir, 'word')
            os.makedirs(word_dir, exist_ok=True)
            
            # 创建基本的document.xml
            basic_doc_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r>
                <w:t>文档内容</w:t>
            </w:r>
        </w:p>
    </w:body>
</w:document>'''
            
            with open(doc_xml_path, 'w', encoding='utf-8') as f:
                f.write(basic_doc_xml)
            print(f"创建了基本的document.xml: {doc_xml_path}")
    else:
        # 有word目录，检查document.xml
        if not os.path.exists(doc_xml_path):
            # 尝试查找其他可能的文档文件
            word_dir = os.path.join(temp_dir, 'word')
            word_files = os.listdir(word_dir)
            print(f"word目录下的文件: {word_files}")
            
            # 查找可能的文档文件
            possible_docs = [f for f in word_files if f.endswith('.xml') and 'document' in f.lower()]
            if possible_docs:
                doc_xml_path = os.path.join(word_dir, possible_docs[0])
                print(f"使用找到的文档文件: {possible_docs[0]}")
            else:
                raise Exception(f"解压后找不到document.xml或其他文档文件")
    
    print(f"document.xml路径: {doc_xml_path}")
    print(f"comments.xml路径: {comments_xml_path}")
    
    # 定义Word命名空间
    w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    
    # 解析文档
    try:
        # 使用更宽松的XML解析器
        parser = etree.XMLParser(remove_blank_text=True, recover=True)
        doc_tree = etree.parse(doc_xml_path, parser)
        doc_root = doc_tree.getroot()
        
        # 检查命名空间映射
        print(f"文档命名空间: {doc_root.nsmap}")
        
        # 添加调试信息：检查文档内容
        print("\n=== 文档内容调试信息 ===")
        paragraphs = doc_root.findall('.//w:p', namespaces={'w': w_ns})
        print(f"找到段落数量: {len(paragraphs)}")
        
        for i, para in enumerate(paragraphs[:5]):  # 只显示前5个段落
            para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
            if para_text.strip():
                print(f"段落{i+1}: '{para_text[:100]}{'...' if len(para_text) > 100 else ''}'")
        
        if len(paragraphs) > 5:
            print(f"... 还有 {len(paragraphs) - 5} 个段落")
        
        # 检查所有文本内容
        all_text = ''.join([t.text for t in doc_root.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
        print(f"文档总文本长度: {len(all_text)}")
        if all_text.strip():
            print(f"文档前200字符: '{all_text[:200]}{'...' if len(all_text) > 200 else ''}'")
        else:
            print("⚠ 警告: 文档中没有找到任何文本内容")
        
        # 如果缺少Word命名空间，重新创建文档
        if 'w' not in doc_root.nsmap:
            print("警告: 文档缺少Word命名空间，重新创建文档结构")
            
            # 创建新的文档根元素，包含正确的命名空间
            new_root = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document',
                                   nsmap={'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'})
            
            # 创建body元素
            body = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}body')
            
            # 尝试从原文档中提取内容
            try:
                # 查找所有段落
                paragraphs = doc_root.findall('.//*[local-name()="p"]')
                if not paragraphs:
                    # 如果没有找到段落，创建一个默认段落
                    p = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                    r = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                    t = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                    t.text = "文档内容"
                    r.append(t)
                    p.append(r)
                    body.append(p)
                else:
                    # 转换现有段落到正确的命名空间
                    for old_p in paragraphs:
                        p = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                        # 复制文本内容
                        for old_r in old_p.findall('.//*[local-name()="r"]'):
                            r = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                            for old_t in old_r.findall('.//*[local-name()="t"]'):
                                if old_t.text:
                                    t = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                                    t.text = old_t.text
                                    r.append(t)
                            if len(r) > 0:
                                p.append(r)
                        if len(p) > 0:
                            body.append(p)
            except Exception as e:
                print(f"转换文档内容时出错: {e}")
                # 创建默认段落
                p = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                r = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                t = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                t.text = "文档内容"
                r.append(t)
                p.append(r)
                body.append(p)
            
            new_root.append(body)
            
            # 更新文档树
            doc_root = new_root
            doc_tree = etree.ElementTree(doc_root)
            
            print("✓ 重新创建了文档结构")
        
        print("✓ document.xml解析成功")
    except Exception as e:
        raise Exception(f"document.xml解析失败: {str(e)}")
    
    # 清理文档中的旧批注标记（覆盖w-api.py插入的空批注）
    print("清理现有的批注标记...")
    
    for elem in doc_root.findall('.//w:commentRangeStart', namespaces={'w': w_ns}):
        elem.getparent().remove(elem)
    for elem in doc_root.findall('.//w:commentRangeEnd', namespaces={'w': w_ns}):
        elem.getparent().remove(elem)
    for elem in doc_root.findall('.//w:commentReference', namespaces={'w': w_ns}):
        elem.getparent().remove(elem)
    
    # 创建新的comments.xml（覆盖现有的）
    MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
    comments_root = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}comments', 
                                nsmap={'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                                      'mc': MC_NS})
    # 添加必需的兼容性属性
    comments_root.set(f"{{{MC_NS}}}Ignorable", "w14 w15 wp14")
    comments_tree = etree.ElementTree(comments_root)
    print("创建新的comments.xml，覆盖现有批注")
    
    # 4. 遍历每个批注，插入到正文和comments.xml
    print("\n=== 开始插入批注 ===")
    print(f"总批注数量: {len(comments)}")

    used_ids = []
    current_id = 0
    for item in comments:
        text = item['text'].strip()
        comment_text = item['comment'].strip()
        comment_id = str(current_id)
        found = False
        
        # 改进的文本匹配逻辑：支持跨段落和跨运行匹配
        print(f"\n查找文本: '{text}'")
        
        # 获取整个文档的文本用于模糊匹配
        all_doc_text = ''.join([t.text for t in doc_root.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
        normalized_doc_text = normalize_text(all_doc_text)
        normalized_target_text = normalize_text(text)
        
        print(f"文档文本长度: {len(normalized_doc_text)}")
        print(f"目标文本: '{normalized_target_text}'")
        
        # 方法1：尝试在单个段落内匹配
        for para in doc_root.findall('.//w:p', namespaces={'w': w_ns}):
            para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
            normalized_para_text = normalize_text(para_text)
            
            if normalized_target_text in normalized_para_text:
                print(f"在段落中找到文本: '{text}'")
                # 在段落内查找具体的运行
                for run in para.findall('.//w:r', namespaces={'w': w_ns}):
                    t = run.find('.//w:t', namespaces={'w': w_ns})
                    if t is not None and text in t.text:
                        print(f"在运行中找到完整文本")
                        before, after = t.text.split(text, 1)
                        parent = run.getparent()
                        idx_run = parent.index(run)

                        if parent.tag != W('p'):
                            print(f"警告: run 的 parent 不是 <w:p>，而是 {parent.tag}，跳过该批注")
                            continue

                        # 前半部分
                        if before:
                            t.text = before
                            insert_idx = idx_run + 1
                        else:
                            parent.remove(run)
                            insert_idx = idx_run

                        # commentRangeStart
                        comment_start = etree.Element(W('commentRangeStart'))
                        comment_start.set(W('id'), comment_id)
                        parent.insert(insert_idx, comment_start)
                        insert_idx += 1

                        # 被批注文本
                        new_run = etree.Element(W('r'))
                        new_t = etree.Element(W('t'))
                        new_t.text = text
                        new_run.append(new_t)
                        parent.insert(insert_idx, new_run)
                        insert_idx += 1

                        # commentRangeEnd
                        comment_end = etree.Element(W('commentRangeEnd'))
                        comment_end.set(W('id'), comment_id)
                        parent.insert(insert_idx, comment_end)
                        insert_idx += 1

                        # commentReference
                        comment_ref_run = etree.Element(W('r'))
                        comment_ref = etree.Element(W('commentReference'))
                        comment_ref.set(W('id'), comment_id)
                        comment_ref_run.append(comment_ref)
                        parent.insert(insert_idx, comment_ref_run)
                        insert_idx += 1

                        # 后半部分
                        if after:
                            after_run = etree.Element(W('r'))
                            after_t = etree.Element(W('t'))
                            after_t.text = after
                            after_run.append(after_t)
                            parent.insert(insert_idx, after_run)

                        found = True
                        break
                if found:
                    break
        
        # 方法2：如果方法1失败，尝试跨运行匹配
        if not found:
            print(f"尝试跨运行匹配文本: '{text}'")
            for para in doc_root.findall('.//w:p', namespaces={'w': w_ns}):
                runs = para.findall('.//w:r', namespaces={'w': w_ns})
                para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
                normalized_para_text = normalize_text(para_text)
                
                if normalized_target_text in normalized_para_text:
                    print(f"在段落中找到跨运行文本: '{text}'")
                    # 找到文本在段落中的位置
                    text_start = normalized_para_text.find(normalized_target_text)
                    text_end = text_start + len(normalized_target_text)
                    
                    # 计算文本跨越的运行
                    current_pos = 0
                    start_run_idx = -1
                    end_run_idx = -1
                    start_run_offset = 0
                    end_run_offset = 0
                    
                    for i, run in enumerate(runs):
                        t = run.find('.//w:t', namespaces={'w': w_ns})
                        if t is not None and t.text:
                            run_length = len(t.text)
                            if start_run_idx == -1 and current_pos + run_length > text_start:
                                start_run_idx = i
                                start_run_offset = text_start - current_pos
                            if end_run_idx == -1 and current_pos + run_length >= text_end:
                                end_run_idx = i
                                end_run_offset = text_end - current_pos
                                break
                            current_pos += run_length
                    
                    if start_run_idx != -1 and end_run_idx != -1:
                        print(f"跨运行匹配成功: 从运行{start_run_idx}到运行{end_run_idx}")
                        # 执行跨运行插入
                        parent = runs[0].getparent()
                        
                        # 插入commentRangeStart
                        comment_start = etree.Element(W('commentRangeStart'))
                        comment_start.set(W('id'), comment_id)
                        parent.insert(parent.index(runs[start_run_idx]), comment_start)
                        
                        # 处理第一个运行
                        first_run = runs[start_run_idx]
                        first_t = first_run.find('.//w:t', namespaces={'w': w_ns})
                        if first_t is not None:
                            before_text = first_t.text[:start_run_offset]
                            if before_text:
                                first_t.text = before_text
                            else:
                                parent.remove(first_run)
                        
                        # 插入被批注文本
                        new_run = etree.Element(W('r'))
                        new_t = etree.Element(W('t'))
                        new_t.text = text
                        new_run.append(new_t)
                        parent.insert(parent.index(runs[start_run_idx] if start_run_idx < len(runs) else parent[-1]), new_run)
                        
                        # 处理最后一个运行
                        if end_run_idx != start_run_idx:
                            last_run = runs[end_run_idx]
                            last_t = last_run.find('.//w:t', namespaces={'w': w_ns})
                            if last_t is not None:
                                after_text = last_t.text[end_run_offset:]
                                if after_text:
                                    last_t.text = after_text
                                else:
                                    parent.remove(last_run)
                        
                        # 删除中间的所有运行
                        for i in range(start_run_idx + 1, end_run_idx):
                            if i < len(runs):
                                parent.remove(runs[i])
                        
                        # 插入commentRangeEnd
                        comment_end = etree.Element(W('commentRangeEnd'))
                        comment_end.set(W('id'), comment_id)
                        parent.append(comment_end)
                        
                        # 插入commentReference
                        comment_ref_run = etree.Element(W('r'))
                        comment_ref = etree.Element(W('commentReference'))
                        comment_ref.set(W('id'), comment_id)
                        comment_ref_run.append(comment_ref)
                        parent.append(comment_ref_run)
                        
                        found = True
                        break
        
        # 方法3：如果前两种方法都失败，尝试模糊匹配
        if not found:
            print(f"尝试模糊匹配文本: '{text}'")
            # 可以调整这个阈值来控制匹配的严格程度
            # 0.9 = 非常严格 (90%相似度)
            # 0.8 = 严格 (80%相似度) 
            # 0.7 = 中等 (70%相似度) - 当前设置
            # 0.6 = 宽松 (60%相似度)
            # 0.5 = 非常宽松 (50%相似度)
            match_result = find_best_text_match(normalized_target_text, normalized_doc_text, threshold=0.7)
            
            if match_result:
                matched_text, similarity, start_pos, end_pos = match_result
                print(f"模糊匹配成功: 相似度 {similarity:.2f}, 匹配文本: '{matched_text}'")
                
                # 在文档中定位匹配的段落
                for para in doc_root.findall('.//w:p', namespaces={'w': w_ns}):
                    para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
                    normalized_para_text = normalize_text(para_text)
                    
                    if matched_text in normalized_para_text:
                        print(f"在段落中找到模糊匹配文本")
                        # 使用匹配到的文本进行插入
                        runs = para.findall('.//w:r', namespaces={'w': w_ns})
                        para_text_full = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
                        
                        # 找到匹配文本在段落中的位置
                        text_start = para_text_full.find(matched_text)
                        text_end = text_start + len(matched_text)
                        
                        # 计算文本跨越的运行
                        current_pos = 0
                        start_run_idx = -1
                        end_run_idx = -1
                        start_run_offset = 0
                        end_run_offset = 0
                        
                        for i, run in enumerate(runs):
                            t = run.find('.//w:t', namespaces={'w': w_ns})
                            if t is not None and t.text:
                                run_length = len(t.text)
                                if start_run_idx == -1 and current_pos + run_length > text_start:
                                    start_run_idx = i
                                    start_run_offset = text_start - current_pos
                                if end_run_idx == -1 and current_pos + run_length >= text_end:
                                    end_run_idx = i
                                    end_run_offset = text_end - current_pos
                                    break
                                current_pos += run_length
                        
                        if start_run_idx != -1 and end_run_idx != -1:
                            print(f"模糊匹配跨运行成功: 从运行{start_run_idx}到运行{end_run_idx}")
                            # 执行跨运行插入
                            parent = runs[0].getparent()
                            
                            # 插入commentRangeStart
                            comment_start = etree.Element(W('commentRangeStart'))
                            comment_start.set(W('id'), comment_id)
                            parent.insert(parent.index(runs[start_run_idx]), comment_start)
                            
                            # 处理第一个运行
                            first_run = runs[start_run_idx]
                            first_t = first_run.find('.//w:t', namespaces={'w': w_ns})
                            if first_t is not None:
                                before_text = first_t.text[:start_run_offset]
                                if before_text:
                                    first_t.text = before_text
                                else:
                                    parent.remove(first_run)
                            
                            # 插入被批注文本（使用原始目标文本）
                            new_run = etree.Element(W('r'))
                            new_t = etree.Element(W('t'))
                            new_t.text = text
                            new_run.append(new_t)
                            parent.insert(parent.index(runs[start_run_idx] if start_run_idx < len(runs) else parent[-1]), new_run)
                            
                            # 处理最后一个运行
                            if end_run_idx != start_run_idx:
                                last_run = runs[end_run_idx]
                                last_t = last_run.find('.//w:t', namespaces={'w': w_ns})
                                if last_t is not None:
                                    after_text = last_t.text[end_run_offset:]
                                    if after_text:
                                        last_t.text = after_text
                                    else:
                                        parent.remove(last_run)
                            
                            # 删除中间的所有运行
                            for i in range(start_run_idx + 1, end_run_idx):
                                if i < len(runs):
                                    parent.remove(runs[i])
                            
                            # 插入commentRangeEnd
                            comment_end = etree.Element(W('commentRangeEnd'))
                            comment_end.set(W('id'), comment_id)
                            parent.append(comment_end)
                            
                            # 插入commentReference
                            comment_ref_run = etree.Element(W('r'))
                            comment_ref = etree.Element(W('commentReference'))
                            comment_ref.set(W('id'), comment_id)
                            comment_ref_run.append(comment_ref)
                            parent.append(comment_ref_run)
                            
                            found = True
                            break
        
        if found:
            # 只有插入成功的批注才写入 comments.xml
            comment_elem = etree.Element(W('comment'))
            comment_elem.set(W('id'), comment_id)
            comment_elem.set(W('author'), '批注系统')
            comment_elem.set(W('date'), '2024-03-14T12:00:00Z')
            p = etree.Element(W('p'))
            r = etree.Element(W('r'))
            t = etree.Element(W('t'))
            t.text = clean_comment_text(comment_text)
            r.append(t)
            p.append(r)
            comment_elem.append(p)
            comments_root.append(comment_elem)
            print(f"✓ 成功插入批注内容")
            used_ids.append(current_id)
            current_id += 1
        else:
            print(f"⚠ 未找到文本 '{text}'，插入到文档最后一页新段落并标注未成功匹配")
            # 新建一个段落
            new_para = etree.Element(W('p'))

            # 插入 commentRangeStart
            comment_start = etree.Element(W('commentRangeStart'))
            comment_start.set(W('id'), comment_id)
            new_para.append(comment_start)

            # 插入特殊文本
            new_run = etree.Element(W('r'))
            new_t = etree.Element(W('t'))
            new_t.text = f"【未成功匹配】{text}"
            new_run.append(new_t)
            new_para.append(new_run)

            # commentRangeEnd
            comment_end = etree.Element(W('commentRangeEnd'))
            comment_end.set(W('id'), comment_id)
            new_para.append(comment_end)

            # commentReference
            comment_ref_run = etree.Element(W('r'))
            comment_ref = etree.Element(W('commentReference'))
            comment_ref.set(W('id'), comment_id)
            comment_ref_run.append(comment_ref)
            new_para.append(comment_ref_run)

            # 把新段落加到文档最后
            body = doc_root.find('.//w:body', namespaces={'w': w_ns})
            body.append(new_para)

            # 写入 comments.xml，内容前加提示
            comment_elem = etree.Element(W('comment'))
            comment_elem.set(W('id'), comment_id)
            comment_elem.set(W('author'), '批注系统')
            comment_elem.set(W('date'), '2024-03-14T12:00:00Z')
            p = etree.Element(W('p'))
            r = etree.Element(W('r'))
            t = etree.Element(W('t'))
            t.text = clean_comment_text(f"【未成功匹配】{comment_text}")
            r.append(t)
            p.append(r)
            comment_elem.append(p)
            comments_root.append(comment_elem)
            used_ids.append(current_id)
            current_id += 1

    print("\n=== 批注插入完成 ===")
    print(f"处理的批注数: {len(comments)}")

    # 统计和输出
    if used_ids:
        print(f"已分配的批注id: {used_ids}")
        print(f"最大id: {max(used_ids)}")
        # 检查是否连续
        expected_ids = list(range(min(used_ids), max(used_ids)+1))
        if used_ids == expected_ids:
            print("id是连续的")
        else:
            print("id不是连续的，缺失: ", set(expected_ids) - set(used_ids))
    else:
        print("没有插入任何批注，id列表为空")

    print("批注id来自变量 current_id，每插入一个成功的批注 current_id += 1")

    # 5. 保存修改后的XML
    try:
        # 确保XML文件有正确的编码和声明
        doc_tree.write(doc_xml_path, xml_declaration=True, encoding='utf-8', standalone='yes')
        comments_tree.write(comments_xml_path, xml_declaration=True, encoding='utf-8', standalone='yes')
        print("✓ XML文件保存成功")
    except Exception as e:
        raise Exception(f"保存XML文件失败: {str(e)}")

    # 6. 打包为新的docx文件
    print("\n=== 第六步：打包为新的docx文件 ===")
    
    # 确保 word/_rels/document.xml.rels 文件存在并包含批注关系
    rels_path = os.path.join(temp_dir, 'word', '_rels', 'document.xml.rels')
    rels_dir = os.path.dirname(rels_path)
    os.makedirs(rels_dir, exist_ok=True)
    
    # 初始化 create_new_rels 变量
    create_new_rels = False
    
    if os.path.exists(rels_path):
        try:
            rels_tree = etree.parse(rels_path)
            rels_root = rels_tree.getroot()
            # 检查是否已有 comments 关系
            has_comments_rel = any(
                rel.get('Type') == 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments'
                for rel in rels_root.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            )
            if not has_comments_rel:
                # 添加 comments 关系
                rel = etree.Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
                rel.set('Id', 'rIdComments')
                rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')
                rel.set('Target', 'comments.xml')
                rels_root.append(rel)
                rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8', standalone='yes')
                print("✓ 在现有rels文件中添加了comments关系")
        except Exception as e:
            print(f"警告: 修改现有rels文件失败: {str(e)}")
            # 如果修改失败，重新创建文件
            create_new_rels = True
    else:
        create_new_rels = True
    
    if create_new_rels:
        # 创建新的rels文件
        rels_root = etree.Element('Relationships', nsmap={None: 'http://schemas.openxmlformats.org/package/2006/relationships'})
        
        # 添加基本关系
        rel = etree.Element('Relationship')
        rel.set('Id', 'rId1')
        rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles')
        rel.set('Target', 'styles.xml')
        rels_root.append(rel)
        
        # 添加批注关系
        rel = etree.Element('Relationship')
        rel.set('Id', 'rIdComments')
        rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')
        rel.set('Target', 'comments.xml')
        rels_root.append(rel)
        
        rels_tree = etree.ElementTree(rels_root)
        rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8', standalone='yes')
        print("✓ 创建了新的document.xml.rels文件")
    
    # 删除旧的输出文件
    if os.path.exists(output_path):
        os.remove(output_path)
    
    # 打包为docx文件
    try:
        # 确保输出目录存在
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
            # 按特定顺序添加文件，确保docx结构正确
            file_order = [
                '[Content_Types].xml',
                '_rels/.rels',
                'word/_rels/document.xml.rels',
                'word/document.xml',
                'word/comments.xml'
            ]
            
            # 首先添加必需的文件
            for file_name in file_order:
                file_path = os.path.join(temp_dir, file_name)
                if os.path.exists(file_path):
                    try:
                        docx.write(file_path, file_name)
                        print(f"✓ 添加文件: {file_name}")
                    except Exception as e:
                        print(f"警告: 写入文件 {file_name} 时出错: {str(e)}")
                        continue
            
            # 然后添加其他文件
            for foldername, subfolders, filenames in os.walk(temp_dir):
                for filename in filenames:
                    file_path = os.path.join(foldername, filename)
                    arcname = os.path.relpath(file_path, temp_dir)
                    
                    # 跳过已经添加的文件
                    if arcname in file_order:
                        continue
                    
                    try:
                        docx.write(file_path, arcname)
                        print(f"✓ 添加文件: {arcname}")
                    except Exception as e:
                        print(f"警告: 写入文件 {arcname} 时出错: {str(e)}")
                        continue
        
        # 验证输出文件
        try:
            with zipfile.ZipFile(output_path, 'r') as test_zip:
                if 'word/document.xml' not in test_zip.namelist():
                    raise Exception("输出文件缺少document.xml")
                if 'word/comments.xml' not in test_zip.namelist():
                    raise Exception("输出文件缺少comments.xml")
                if 'word/_rels/document.xml.rels' not in test_zip.namelist():
                    raise Exception("输出文件缺少document.xml.rels")
            print("✓ docx文件打包成功并验证通过")
        except Exception as e:
            raise Exception(f"输出文件验证失败: {str(e)}")
            
    except Exception as e:
        raise Exception(f"打包docx文件失败: {str(e)}")

    # 7. 清理临时文件夹
    try:
        shutil.rmtree(temp_dir)
        print("✓ 临时文件夹清理完成")
    except Exception as e:
        print(f"警告: 清理临时文件夹时出错: {str(e)}")
    
    # 8. 调试：检查生成的XML结构
    print("\n=== 调试信息 ===")
    try:
        with zipfile.ZipFile(output_path, 'r') as docx:
            # 检查document.xml中的批注标记
            doc_content = docx.read('word/document.xml').decode('utf-8')
            comment_starts = doc_content.count('<w:commentRangeStart')
            comment_ends = doc_content.count('<w:commentRangeEnd')
            comment_refs = doc_content.count('<w:commentReference')
            print(f"document.xml中: commentRangeStart={comment_starts}, commentRangeEnd={comment_ends}, commentReference={comment_refs}")
            
            # 检查comments.xml中的批注
            if 'word/comments.xml' in docx.namelist():
                comments_content = docx.read('word/comments.xml').decode('utf-8')
                comment_elements = comments_content.count('<w:comment')
                print(f"comments.xml中: comment元素={comment_elements}")
            else:
                print("警告: comments.xml不存在")
                
            # 检查rels关系
            if 'word/_rels/document.xml.rels' in docx.namelist():
                rels_content = docx.read('word/_rels/document.xml.rels').decode('utf-8')
                comments_rel = rels_content.count('comments.xml')
                print(f"rels中: comments关系={comments_rel}")
            else:
                print("警告: document.xml.rels不存在")
                
    except Exception as e:
        print(f"调试检查时出错: {str(e)}")

    # 维护 word/_rels/document.xml.rels
    rels_path = os.path.join(temp_dir, 'word', '_rels', 'document.xml.rels')
    if os.path.exists(rels_path):
        rels_tree = etree.parse(rels_path)
        rels_root = rels_tree.getroot()
        # 检查是否已有 comments 关系
        has_comments_rel = any(
            rel.get('Type') == 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments'
            for rel in rels_root.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
        )
        if not has_comments_rel:
            # 添加 comments 关系
            rel = etree.Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            rel.set('Id', 'rIdComments')
            rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')
            rel.set('Target', 'comments.xml')
            rels_root.append(rel)
            rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8', standalone='yes')
    else:
        # 如果没有rels文件，创建一个
        rels_dir = os.path.dirname(rels_path)
        os.makedirs(rels_dir, exist_ok=True)
        rels_root = etree.Element('Relationships', nsmap={None: 'http://schemas.openxmlformats.org/package/2006/relationships'})
        rel = etree.Element('Relationship')
        rel.set('Id', 'rIdComments')
        rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')
        rel.set('Target', 'comments.xml')
        rels_root.append(rel)
        rels_tree = etree.ElementTree(rels_root)
        rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8', standalone='yes')

# 使用LibreOffice将.docx文件转换为.doc格式，并重命名输出文件到指定路径。
def convert_docx_to_doc(docx_path, doc_path):
    """将.docx文件转换为.doc格式（使用LibreOffice）"""
    try:
        print(f"开始将docx转换为doc: {docx_path} -> {doc_path}")
        
        # 验证输入文件
        if not os.path.exists(docx_path):
            raise Exception(f"输入文件不存在: {docx_path}")
        
        print(f"输入文件大小: {os.path.getsize(docx_path)} bytes")
        
        # 获取LibreOffice路径
        soffice_path = find_libreoffice()
        print(f"使用LibreOffice: {soffice_path}")
        
        # 准备转换命令
        output_dir = os.path.dirname(doc_path)
        cmd = [
            soffice_path,
            '--headless',
            '--convert-to', 'doc',
            '--outdir', output_dir,
            docx_path
        ]
        
        print(f"执行命令: {' '.join(cmd)}")
        
        # 执行转换
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        print(f"转换命令返回码: {result.returncode}")
        if result.stdout:
            print(f"转换输出: {result.stdout}")
        if result.stderr:
            print(f"转换错误: {result.stderr}")
        
        if result.returncode != 0:
            raise Exception(f'LibreOffice转换docx到doc失败: {result.stderr}')
        
        # LibreOffice会自动命名输出文件，需重命名
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        generated_doc = os.path.join(output_dir, base_name + '.doc')
        
        print(f"LibreOffice生成的文件: {generated_doc}")
        print(f"目标文件: {doc_path}")
        
        # 检查生成的文件是否存在
        if not os.path.exists(generated_doc):
            # 列出输出目录中的所有文件
            print(f"输出目录 {output_dir} 中的文件:")
            for file in os.listdir(output_dir):
                file_path = os.path.join(output_dir, file)
                if os.path.isfile(file_path):
                    print(f"  - {file} ({os.path.getsize(file_path)} bytes)")
                else:
                    print(f"  - {file} (目录)")
            raise Exception(f"LibreOffice未生成预期的doc文件: {generated_doc}")
        
        # 重命名文件
        if generated_doc != doc_path:
            print(f"重命名文件: {generated_doc} -> {doc_path}")
            os.rename(generated_doc, doc_path)
        
        # 验证最终文件
        if os.path.exists(doc_path):
            print(f"✓ 转换成功: {doc_path}")
            print(f"最终文件大小: {os.path.getsize(doc_path)} bytes")
        else:
            raise Exception(f"最终文件不存在: {doc_path}")
            
    except subprocess.TimeoutExpired:
        raise Exception("LibreOffice转换超时")
    except Exception as e:
        raise Exception(f"转换docx到doc失败: {str(e)}")

# 主程序入口，启动Flask应用，默认在本地开发环境运行。
if __name__ == '__main__':
    app.run(debug=True)