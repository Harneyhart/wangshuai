import io
import os
import shutil
import zipfile
import requests
from flask import Flask, request, send_file, render_template, redirect, url_for, flash
from lxml import etree
from lxml.etree import QName
import uuid

app = Flask(__name__)
app.secret_key = 'replace-with-your-own-secret'  # 用于 flash 消息显示

API_KEY = "sk-d2454a7a030e42548175b22eb35a4589"
API_URL = "https://api.deepseek.com/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
def W(tag): return f"{{{W_NS}}}{tag}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload():
    try:
        if 'file' not in request.files:
            flash('未上传文件')
            return redirect(url_for('index'))

        file = request.files['file']
        if file.filename == '' or not file.filename.endswith('.docx'):
            flash('只允许上传 .docx 文件')
            return redirect(url_for('index'))

        tmp_dir = "tmp_docx"
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)
        os.mkdir(tmp_dir)

        input_stream = io.BytesIO(file.read())
        with zipfile.ZipFile(input_stream) as zip_ref:
            zip_ref.extractall(tmp_dir)

        document_path = os.path.join(tmp_dir, "word", "document.xml")
        comments_path = os.path.join(tmp_dir, "word", "comments.xml")
        rels_path = os.path.join(tmp_dir, "word", "_rels", "document.xml.rels")

        parser = etree.XMLParser(remove_blank_text=True)
        doc_tree = etree.parse(document_path, parser)
        doc_root = doc_tree.getroot()

        MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
        R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        
        # 创建 comments.xml
        if not os.path.exists(comments_path):
            nsmap = {
                'w': W_NS,
                'mc': MC_NS
            }
            comments_root = etree.Element(W("comments"), nsmap=nsmap)
            # 添加必需的兼容性属性
            comments_root.set(f"{{{MC_NS}}}Ignorable", "w14 w15 wp14")
            etree.ElementTree(comments_root).write(comments_path, xml_declaration=True, encoding='utf-8', standalone="yes")

        comments_tree = etree.parse(comments_path, parser)
        comments_root = comments_tree.getroot()

        # 添加 rels 关系
        if os.path.exists(rels_path):
            rels_tree = etree.parse(rels_path, parser)
            rels_root = rels_tree.getroot()
            R_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

            has_comments = any(
                rel.get("Type") == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
                for rel in rels_root.findall(f"{{{R_NS}}}Relationship")
            )

            if not has_comments:
                # 动态生成不重复的 rId
                existing_ids = [rel.get("Id") for rel in rels_root.findall(f"{{{R_NS}}}Relationship")]
                idx = 1000
                while f"rId{idx}" in existing_ids:
                    idx += 1
                new_rid = f"rId{idx}"

                # 使用新的不重复 rId
                new_rel = etree.Element("Relationship", {
                    "Id": new_rid,
                    "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
                    "Target": "comments.xml"
                })
                rels_root.append(new_rel)
                rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8')

        paragraphs = doc_root.xpath('//w:p', namespaces={'w': W_NS})
        comment_id = 0
        all_comments = []

        # 只处理第一个有内容的段落
        for p in paragraphs:
            texts = "".join(p.xpath('.//w:t/text()', namespaces={'w': W_NS}))
            if not texts.strip():
                continue

            # 不再调用API，直接使用空内容
            comment_text = ""
            all_comments.append(comment_text)

            cid = str(comment_id)
            comment_start = etree.Element(W("commentRangeStart"), {QName(W_NS, "id"): cid})
            comment_end = etree.Element(W("commentRangeEnd"), {QName(W_NS, "id"): cid})

            # 创建包含范围标记的运行(run)
            range_run = etree.Element(W("r"))
            range_run.append(comment_start)
                
            # 在段落开头插入范围标记
            p.insert(0, range_run)
                
            # 在段落结尾插入结束标记
            end_run = etree.Element(W("r"))
            end_run.append(comment_end)
            p.append(end_run)
                
            # 创建批注引用
            ref_run = etree.Element(W("r"))
            ref_run.append(etree.Element(W("commentReference"), {W("id"): cid}))
            p.append(ref_run)

            comment = etree.Element(W("comment"), {
                W("id"): cid,
                W("author"): "AI编辑",
                W("initials"): "AI",
                W("date"): "2025-06-05T12:00:00Z",
            })

            p_comment = etree.SubElement(comment, W("p"))
            r_comment = etree.SubElement(p_comment, W("r"))
            t_comment = etree.SubElement(r_comment, W("t"))
            t_comment.text = ""  # 批注内容为空
            comments_root.append(comment)
            comment_id += 1
            
            # 只处理一个段落后就退出
            break

        # 在文档末尾添加批注总结（只添加一个）
        if all_comments:
            p_new = etree.SubElement(doc_root, W("p"))
            r_new = etree.SubElement(p_new, W("r"))
            t_new = etree.SubElement(r_new, W("t"))
            t_new.text = "[批注系统] 空批注"

        doc_tree.write(document_path, xml_declaration=True, encoding='utf-8')
        comments_tree.write(comments_path, xml_declaration=True, encoding='utf-8')

        output_stream = io.BytesIO()
        print("comments.xml 路径：", os.path.abspath(comments_path))

        with zipfile.ZipFile(output_stream, 'w', zipfile.ZIP_DEFLATED) as docx_zip:
            for foldername, subfolders, filenames in os.walk(tmp_dir):
                for filename in filenames:
                    file_path = os.path.join(foldername, filename)
                    archive_path = os.path.relpath(file_path, tmp_dir)
                    docx_zip.write(file_path, archive_path)
        output_stream.seek(0)

        # 清理临时文件
        shutil.rmtree(tmp_dir)

        return send_file(
            output_stream,
            as_attachment=True,
            download_name="commented_" + file.filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        flash(f"处理文件时出错: {e}")
        return redirect(url_for('index'))

def clean_comment_text(text):
    # 替换XML特殊字符
    return (text.replace("&", "&amp;")
               .replace("<", "&lt;")
               .replace(">", "&gt;")
               .replace('"', "&quot;")
               .replace("'", "&apos;"))

def call_deepseek_api(text):
    prompt = f"请你扮演专业编辑，对下列段落进行批注：\n\n{text}\n\n仅返回一句批注建议。"
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5
    }
    resp = requests.post(API_URL, headers=HEADERS, json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']['content']

def process_docx_file(docx_path):
    """独立处理docx文件的函数，不依赖Flask"""
    try:
        print(f"开始处理文件: {docx_path}")
        
        # 验证输入文件
        if not os.path.exists(docx_path):
            raise Exception(f"输入文件不存在: {docx_path}")
        
        # 验证文件格式
        try:
            with zipfile.ZipFile(docx_path, 'r') as docx:
                if 'word/document.xml' not in docx.namelist():
                    raise Exception("输入文件格式不正确，缺少document.xml")
                print("✓ 输入文件格式验证通过")
        except Exception as e:
            raise Exception(f"输入文件格式验证失败: {str(e)}")
        
        tmp_dir = "tmp_docx_" + str(uuid.uuid4())
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)
        os.mkdir(tmp_dir)
        print(f"临时目录: {tmp_dir}")

        # 解压文件到临时目录
        try:
            with zipfile.ZipFile(docx_path, 'r') as zip_ref:
                zip_ref.extractall(tmp_dir)
            print("✓ 文件解压完成")
        except Exception as e:
            raise Exception(f"文件解压失败: {str(e)}")

        document_path = os.path.join(tmp_dir, "word", "document.xml")
        comments_path = os.path.join(tmp_dir, "word", "comments.xml")
        rels_path = os.path.join(tmp_dir, "word", "_rels", "document.xml.rels")
        
        # 验证解压后的文件
        if not os.path.exists(document_path):
            raise Exception(f"解压后找不到document.xml: {document_path}")

        parser = etree.XMLParser(remove_blank_text=True)
        doc_tree = etree.parse(document_path, parser)
        doc_root = doc_tree.getroot()

        MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
        R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        
        # 创建 comments.xml
        if not os.path.exists(comments_path):
            nsmap = {
                'w': W_NS,
                'mc': MC_NS
            }
            comments_root = etree.Element(W("comments"), nsmap=nsmap)
            # 添加必需的兼容性属性
            comments_root.set(f"{{{MC_NS}}}Ignorable", "w14 w15 wp14")
            etree.ElementTree(comments_root).write(comments_path, xml_declaration=True, encoding='utf-8', standalone="yes")

        comments_tree = etree.parse(comments_path, parser)
        comments_root = comments_tree.getroot()

        # 添加 rels 关系
        if os.path.exists(rels_path):
            rels_tree = etree.parse(rels_path, parser)
            rels_root = rels_tree.getroot()
            R_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

            has_comments = any(
                rel.get("Type") == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
                for rel in rels_root.findall(f"{{{R_NS}}}Relationship")
            )

            if not has_comments:
                # 动态生成不重复的 rId
                existing_ids = [rel.get("Id") for rel in rels_root.findall(f"{{{R_NS}}}Relationship")]
                idx = 1000
                while f"rId{idx}" in existing_ids:
                    idx += 1
                new_rid = f"rId{idx}"

                # 使用新的不重复 rId
                new_rel = etree.Element("Relationship", {
                    "Id": new_rid,
                    "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
                    "Target": "comments.xml"
                })
                rels_root.append(new_rel)
                rels_tree.write(rels_path, xml_declaration=True, encoding='utf-8')

        paragraphs = doc_root.xpath('//w:p', namespaces={'w': W_NS})
        comment_id = 0
        all_comments = []

        # 只处理第一个有内容的段落
        for p in paragraphs:
            texts = "".join(p.xpath('.//w:t/text()', namespaces={'w': W_NS}))
            if not texts.strip():
                continue

            # 不再调用API，直接使用空内容
            comment_text = ""
            all_comments.append(comment_text)

            cid = str(comment_id)
            comment_start = etree.Element(W("commentRangeStart"), {QName(W_NS, "id"): cid})
            comment_end = etree.Element(W("commentRangeEnd"), {QName(W_NS, "id"): cid})

            # 创建包含范围标记的运行(run)
            range_run = etree.Element(W("r"))
            range_run.append(comment_start)
                
            # 在段落开头插入范围标记
            p.insert(0, range_run)
                
            # 在段落结尾插入结束标记
            end_run = etree.Element(W("r"))
            end_run.append(comment_end)
            p.append(end_run)
                
            # 创建批注引用
            ref_run = etree.Element(W("r"))
            ref_run.append(etree.Element(W("commentReference"), {W("id"): cid}))
            p.append(ref_run)

            comment = etree.Element(W("comment"), {
                W("id"): cid,
                W("author"): "AI编辑",
                W("initials"): "AI",
                W("date"): "2025-06-05T12:00:00Z",
            })

            p_comment = etree.SubElement(comment, W("p"))
            r_comment = etree.SubElement(p_comment, W("r"))
            t_comment = etree.SubElement(r_comment, W("t"))
            t_comment.text = ""  # 批注内容为空
            comments_root.append(comment)
            comment_id += 1
            
            # 只处理一个段落后就退出
            break

        # 在文档末尾添加批注总结（只添加一个）
        if all_comments:
            p_new = etree.SubElement(doc_root, W("p"))
            r_new = etree.SubElement(p_new, W("r"))
            t_new = etree.SubElement(r_new, W("t"))
            t_new.text = "[AI批注] 空批注"

        # 保存修改后的XML
        try:
            doc_tree.write(document_path, xml_declaration=True, encoding='utf-8')
            comments_tree.write(comments_path, xml_declaration=True, encoding='utf-8')
            print("✓ XML文件保存成功")
        except Exception as e:
            raise Exception(f"保存XML文件失败: {str(e)}")

        # 重新打包为docx，覆盖原文件
        try:
            with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as docx_zip:
                for foldername, subfolders, filenames in os.walk(tmp_dir):
                    for filename in filenames:
                        file_path = os.path.join(foldername, filename)
                        archive_path = os.path.relpath(file_path, tmp_dir)
                        try:
                            docx_zip.write(file_path, archive_path)
                        except Exception as e:
                            print(f"警告: 写入文件 {archive_path} 时出错: {str(e)}")
                            continue
            print("✓ docx文件打包成功")
        except Exception as e:
            raise Exception(f"打包docx文件失败: {str(e)}")

        # 清理临时文件
        try:
            shutil.rmtree(tmp_dir)
            print("✓ 临时文件夹清理完成")
        except Exception as e:
            print(f"警告: 清理临时文件夹时出错: {str(e)}")
            
        print(f"成功处理文件: {docx_path}")

    except Exception as e:
        print(f"处理文件时出错: {e}")
        # 清理临时文件
        if 'tmp_dir' in locals() and os.path.exists(tmp_dir):
            try:
                shutil.rmtree(tmp_dir)
            except:
                pass
        raise e

if __name__ == '__main__':
    app.run(debug=True)