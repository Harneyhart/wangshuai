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
        
        # 使用 LibreOffice 进行转换
        result = subprocess.run([
            soffice_path,
            '--headless',
            '--convert-to', 'docx',
            '--outdir', temp_dir,
            doc_path
        ], capture_output=True, text=True, encoding='utf-8', errors='ignore')
        
        # 检查转换结果
        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else "未知错误"
            raise Exception(f"转换失败: {error_msg}")
            
        # 获取转换后的文件路径
        base_name = os.path.splitext(os.path.basename(doc_path))[0]
        converted_file = os.path.join(temp_dir, f"{base_name}.docx")
        
        # 验证转换后的文件
        if not os.path.exists(converted_file):
            raise Exception(f"转换后的文件不存在: {converted_file}")
            
        # 验证文件格式
        with zipfile.ZipFile(converted_file, 'r') as docx:
            if 'word/document.xml' not in docx.namelist():
                raise Exception("转换后的文件格式不正确")
                
        return converted_file
        
    except Exception as e:
        # 清理临时文件
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
        raise Exception(f"转换失败: {str(e)}")

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
            
        # 读取Excel中的批注
        comments = read_comments_from_excel(excel_path)
        print("\n=== 从Excel读取到的批注 ===")
        for comment in comments:
            print(f"文本: {comment['text']}")
            print(f"批注: {comment['comment']}")
            print("---")
            
        # 保存修改后的文档
        original_extension = os.path.splitext(word_file.filename)[1]  # 获取原始文件后缀
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'output_' + os.path.splitext(os.path.basename(word_path))[0] + original_extension)
        
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
            # 添加批注到文档
            add_comments_to_docx_xml(word_path, comments, output_path)
            print(f"\n文档已保存到: {output_path}")
            
            # 清理临时文件
            if word_path.endswith('.docx') and 'temp' in word_path:
                try:
                    os.remove(word_path)
                except Exception as e:
                    print(f"警告: 清理临时文件失败: {str(e)}")
            try:
                os.remove(excel_path)
            except Exception as e:
                print(f"警告: 清理Excel文件失败: {str(e)}")
            
            return jsonify({
                'message': '文件处理成功',
                'output_file': os.path.basename(output_path)
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
    # 1. 解压 docx
    temp_dir = 'temp_docx_' + str(uuid.uuid4())
    os.makedirs(temp_dir, exist_ok=True)
    with zipfile.ZipFile(docx_path, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)

    # 2. 解析 document.xml 和 comments.xml
    doc_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
    comments_xml_path = os.path.join(temp_dir, 'word', 'comments.xml')
    
    # 解析文档
    doc_tree = etree.parse(doc_xml_path)
    doc_root = doc_tree.getroot()
    
    # 清理文档中的旧批注
    for elem in doc_root.findall('.//w:commentRangeStart', namespaces=doc_root.nsmap):
        elem.getparent().remove(elem)
    for elem in doc_root.findall('.//w:commentRangeEnd', namespaces=doc_root.nsmap):
        elem.getparent().remove(elem)
    for elem in doc_root.findall('.//w:commentReference', namespaces=doc_root.nsmap):
        elem.getparent().remove(elem)
    
    # 创建新的comments.xml
    comments_root = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}comments', 
                                nsmap={'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'})
    comments_tree = etree.ElementTree(comments_root)
    
    # 4. 遍历每个批注，插入到正文和comments.xml
    print("\n=== 开始处理批注 ===")
    print(f"总批注数量: {len(comments)}")
    
    for idx, item in enumerate(comments):
        text = item['text'].strip()
        comment_text = item['comment'].strip()
        comment_id = str(idx + 1)  # 使用从1开始的连续ID
        print(f"\n处理第 {idx + 1}/{len(comments)} 个批注:")
        print(f"目标文本: {text}")
        print(f"批注内容: {comment_text}")

        # 在document.xml中查找目标文本
        found = False
        for para in doc_root.findall('.//w:p', namespaces=doc_root.nsmap):
            para_text = ''.join([t.text for t in para.findall('.//w:t', namespaces=doc_root.nsmap) if t.text])
            if text in para_text:
                print(f"在段落中找到文本: {para_text}")
                # 找到包含目标文本的运行
                for run in para.findall('.//w:r', namespaces=doc_root.nsmap):
                    t = run.find('.//w:t', namespaces=doc_root.nsmap)
                    if t is not None and text in t.text:
                        print(f"在运行中找到文本: {t.text}")
                        # 拆分文本，插入批注标记
                        before, after = t.text.split(text, 1)
                        t.text = before

                        # 插入 commentRangeStart
                        comment_start = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeStart', nsmap=doc_root.nsmap)
                        comment_start.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', comment_id)
                        run.addnext(comment_start)

                        # 插入目标文本
                        new_run = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r', nsmap=doc_root.nsmap)
                        new_t = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t', nsmap=doc_root.nsmap)
                        new_t.text = text
                        new_run.append(new_t)
                        comment_start.addnext(new_run)

                        # 插入 commentRangeEnd
                        comment_end = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeEnd', nsmap=doc_root.nsmap)
                        comment_end.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', comment_id)
                        new_run.addnext(comment_end)

                        # 插入 commentReference
                        comment_ref_run = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r', nsmap=doc_root.nsmap)
                        comment_ref = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentReference', nsmap=doc_root.nsmap)
                        comment_ref.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', comment_id)
                        comment_ref_run.append(comment_ref)
                        comment_end.addnext(comment_ref_run)

                        found = True
                        print("成功插入批注")
                        break
                if found:
                    break
        if not found:
            print(f"警告: 未找到文本 '{text}'")

        # 在comments.xml中插入批注内容
        comment_elem = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}comment', nsmap=comments_root.nsmap)
        comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', comment_id)
        comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '批注系统')
        comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '2024-03-14T12:00:00Z')
        p = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p', nsmap=comments_root.nsmap)
        r = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r', nsmap=comments_root.nsmap)
        t = etree.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t', nsmap=comments_root.nsmap)
        t.text = comment_text
        r.append(t)
        p.append(r)
        comment_elem.append(p)
        comments_root.append(comment_elem)

    print("\n=== 批注处理完成 ===")
    print(f"成功处理的批注数: {len(comments)}")

    # 5. 保存修改后的XML
    doc_tree.write(doc_xml_path, xml_declaration=True, encoding='utf-8', standalone='yes')
    comments_tree.write(comments_xml_path, xml_declaration=True, encoding='utf-8', standalone='yes')

    # 6. 重新打包为docx
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
        for foldername, subfolders, filenames in os.walk(temp_dir):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)
                arcname = os.path.relpath(file_path, temp_dir)
                docx.write(file_path, arcname)

    # 7. 清理临时文件夹
    shutil.rmtree(temp_dir)

if __name__ == '__main__':
    app.run(debug=True)