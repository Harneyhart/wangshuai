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

app = Flask(__name__)
app.secret_key = 'replace-with-your-own-secret'

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
def W(tag): return f"{{{W_NS}}}{tag}"

# 确保上传目录存在
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def find_libreoffice():
    """查找 LibreOffice 可执行文件路径"""
    soffice_path = r"C:\Program Files\LibreOffice\program\soffice.exe"
    if not os.path.exists(soffice_path):
        raise Exception("未找到 LibreOffice，请确保已安装 LibreOffice")
    return soffice_path

def convert_doc_to_docx_alternative(doc_path):
    """备用的.doc转换方法，使用docx2txt"""
    try:
        import docx2txt
        from docx import Document
        # 读取.doc文件内容
        text = docx2txt.process(doc_path)
        # 创建新的.docx文档
        doc = Document()
        
        # 按行分割文本并添加到文档
        lines = text.split('\n')
        for line in lines:
            if line.strip():  # 只添加非空行
                doc.add_paragraph(line.strip())
        
        # 保存到临时文件
        temp_dir = tempfile.mkdtemp()
        converted_file = os.path.join(temp_dir, f"{os.path.splitext(os.path.basename(doc_path))[0]}.docx")
        
        doc.save(converted_file)
        return converted_file
        
    except ImportError:
        raise Exception("备用转换方法需要安装docx2txt库: pip install docx2txt")
    except Exception as e:
        raise Exception(f"备用转换失败: {str(e)}")

def convert_doc_to_docx(doc_path):
    """将 .doc 文件转换为 .docx 格式"""
    temp_dir = None
    try:
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        # 确保源文件存在
        if not os.path.exists(doc_path):
            raise Exception(f"源文件不存在: {doc_path}")
        # 获取 LibreOffice 路径
        soffice_path = find_libreoffice()
        result = subprocess.run([
            soffice_path,
            '--headless',
            '--convert-to', 'docx',
            '--outdir', temp_dir,
            doc_path
        ], capture_output=True, text=True, encoding='utf-8', errors='ignore')
        
        if result.stderr:
            print(f"转换命令错误: {result.stderr}")
        
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
            # 列出临时目录中的所有文件
            for file in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file)
                if os.path.isfile(file_path):
                    print(f"  - {file} ({os.path.getsize(file_path)} bytes)")
                else:
                    print(f"  - {file} (目录)")
            print("LibreOffice转换失败，尝试备用方法")
            return convert_doc_to_docx_alternative(doc_path)
            
        # 智能验证文件格式
        print("验证转换后的文件格式...")
        try:
            with zipfile.ZipFile(converted_file, 'r') as docx:
                file_list = docx.namelist()
                
                # 检查不同的文档格式
                if 'word/document.xml' in file_list:
                    print("✓ 转换为Office Open XML格式成功")
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
        return converted_file
        
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

@app.route('/')
def index():
    return render_template('index.html')

def create_element(name):
    """创建 XML 元素"""
    return OxmlElement(name)

def create_attribute(element, name, value):
    """设置 XML 元素属性"""
    element.set(qn(name), value)

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
        
        # 如果是 .doc 文件，先转换为 .docx
        if word_path.endswith('.doc'):
            word_path = convert_doc_to_docx(word_path)
            # 验证转换后的文件
            if not os.path.exists(word_path):
                raise Exception(f"转换后的文件不存在: {word_path}")
            # 验证文件格式
            try:
                with zipfile.ZipFile(word_path, 'r') as docx:
                    if 'word/document.xml' not in docx.namelist():
                        raise Exception("转换后的文件格式不正确，缺少document.xml")
            except Exception as e:
                raise Exception(f"转换后的文件格式验证失败: {str(e)}")
            
        # 读取Excel中的批注
        comments = read_comments_from_excel(excel_path)
        print("\n=== 从Excel读取到的批注 ===")
        for comment in comments:
            print(f"文本: {comment['text']}")
            print(f"批注: {comment['comment']}")
            print("---")
            
        # 保存修改后的文档
        original_extension = os.path.splitext(word_file.filename)[1]  # 获取原始文件后缀
        output_base = 'output_' + os.path.splitext(os.path.basename(word_path))[0]
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_base + '.docx')
        
        # 检查输出文件是否已存在，如果存在则删除
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception as e:
                print(f"警告: 无法删除已存在的输出文件: {str(e)}")
                # 如果无法删除，使用新的文件名
                output_path = os.path.join(app.config['UPLOAD_FOLDER'], f'output_{uuid.uuid4()}{original_extension}')
        
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
            # 第一步：复制Word文件
            print("\n=== 第一步：复制Word文件 ===")
            copied_word_path = os.path.join(app.config['UPLOAD_FOLDER'], f'copied_{uuid.uuid4()}{original_extension}')
            shutil.copy2(word_path, copied_word_path)
            print(f"Word文件已复制到: {copied_word_path}")
            
            # 第二步：调用w-api.py插入空批注
            print("\n=== 第二步：调用w-api.py插入空批注 ===")
            w_api_path = r"E:\809\word-api\api\w-api.py"
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
            
            # 如果原始文件是.doc，处理后再转回真正的doc格式
            final_output_path = output_path
            if original_extension.lower() == '.doc':
                final_output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_base + '.doc')
                print(f"\n=== 第四步：将docx转换为doc ===")
                convert_docx_to_doc(output_path, final_output_path)
                print(f"已转换为doc: {final_output_path}")
                # 删除中间docx文件
                try:
                    os.remove(output_path)
                except Exception as e:
                    print(f"警告: 删除中间docx文件失败: {str(e)}")
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

def clean_comment_text(text):
    """清理批注文本，确保特殊字符被正确转义"""
    return (text.replace("&", "&amp;")
               .replace("<", "&lt;")
               .replace(">", "&gt;")
               .replace('"', "&quot;")
               .replace("'", "&apos;"))

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
    
    # 解析文档
    try:
        # 使用更宽松的XML解析器
        parser = etree.XMLParser(remove_blank_text=True, recover=True)
        doc_tree = etree.parse(doc_xml_path, parser)
        doc_root = doc_tree.getroot()
        
        # 检查命名空间映射
        print(f"文档命名空间: {doc_root.nsmap}")
        
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
    
    # 使用正确的命名空间进行查找
    w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    
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
        for para in doc_root.findall('.//w:p', namespaces={'w': w_ns}):
            para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces={'w': w_ns}) if t.text])
            if text in para_text:
                for run in para.findall('.//w:r', namespaces={'w': w_ns}):
                    t = run.find('.//w:t', namespaces={'w': w_ns})
                    if t is not None and text in t.text:
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
            print(f"成功插入批注内容")
            used_ids.append(current_id)
            current_id += 1
        else:
            print(f"警告: 未找到文本 '{text}'，插入到文档最后一页新段落并标注未成功匹配")
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

    # 6. 重新打包为docx
    try:
        # 确保输出目录存在
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        # 删除已存在的输出文件
        if os.path.exists(output_path):
            os.remove(output_path)
        
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
                    except Exception as e:
                        continue
            
            # 然后添加其他文件
            for foldername, subfolders, filenames in os.walk(temp_dir):
                for filename in filenames:
                    file_path = os.path.join(foldername, filename)
                    arcname = os.path.relpath(file_path, temp_dir)
                    
                    # 跳过已经添加的文件
                    if arcname in file_order:
                        continue
                    
                    # try:
                    #     docx.write(file_path, arcname)
                    #     print(f"✓ 添加文件: {arcname}")
                    # except Exception as e:
                    #     print(f"警告: 写入文件 {arcname} 时出错: {str(e)}")
                    #     continue
        
        # 验证输出文件
        try:
            with zipfile.ZipFile(output_path, 'r') as test_zip:
                if 'word/document.xml' not in test_zip.namelist():
                    raise Exception("输出文件缺少document.xml")
                if 'word/comments.xml' not in test_zip.namelist():
                    raise Exception("输出文件缺少comments.xml")
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

def convert_docx_to_doc(docx_path, doc_path):
    """将.docx文件转换为.doc格式（使用LibreOffice）"""
    soffice_path = find_libreoffice()
    cmd = [
        soffice_path,
        '--headless',
        '--convert-to', 'doc',
        '--outdir', os.path.dirname(doc_path),
        docx_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f'LibreOffice转换docx到doc失败: {result.stderr}')
    # LibreOffice会自动命名输出文件，需重命名
    base_name = os.path.splitext(os.path.basename(docx_path))[0]
    generated_doc = os.path.join(os.path.dirname(doc_path), base_name + '.doc')
    if generated_doc != doc_path:
        os.rename(generated_doc, doc_path)

if __name__ == '__main__':
    app.run(debug=True)