#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模拟Web上传过程，测试中文文件名处理
"""

import os
import shutil
from werkzeug.utils import secure_filename
import uuid
from app import convert_doc_to_docx, read_comments_from_excel

def test_web_upload_simulation():
    """模拟Web上传过程"""
    
    # 模拟原始文件
    original_file = r"E:\809\合同模板及对齐需求\保密协议\保密协议模板.doc"
    
    print(f"原始文件: {original_file}")
    
    if not os.path.exists(original_file):
        print("✗ 原始文件不存在")
        return
    
    # 模拟Web上传的文件保存过程
    print("\n=== 模拟Web上传过程 ===")
    
    # 生成安全的文件名
    original_filename = os.path.basename(original_file)
    safe_filename = secure_filename(original_filename)
    print(f"原始文件名: {original_filename}")
    print(f"安全文件名: {safe_filename}")
    
    # 生成唯一文件名
    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
    print(f"唯一文件名: {unique_filename}")
    
    # 保存到uploads目录
    uploads_dir = 'uploads'
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
    
    upload_path = os.path.join(uploads_dir, unique_filename)
    print(f"上传路径: {upload_path}")
    
    # 复制文件
    try:
        shutil.copy2(original_file, upload_path)
        print(f"✓ 文件复制成功: {upload_path}")
        print(f"文件大小: {os.path.getsize(upload_path)} bytes")
    except Exception as e:
        print(f"✗ 文件复制失败: {e}")
        return
    
    # 模拟转换过程
    print("\n=== 模拟转换过程 ===")
    try:
        converted_temp_path = convert_doc_to_docx(upload_path)
        print(f"✓ 转换成功: {converted_temp_path}")
        
        # 查找save-word中的文件
        original_name = os.path.splitext(original_filename)[0]
        print(f"查找save-word中的文件，原始名称: {original_name}")
        
        save_word_files = []
        save_word_dir = 'save-word'
        if os.path.exists(save_word_dir):
            for file in os.listdir(save_word_dir):
                if file.startswith(f"converted_{original_name}") and file.endswith('.docx'):
                    save_word_files.append(file)
        
        if save_word_files:
            save_word_files.sort(key=lambda x: os.path.getmtime(os.path.join(save_word_dir, x)), reverse=True)
            latest_file = save_word_files[0]
            docx_path_for_processing = os.path.join(save_word_dir, latest_file)
            print(f"✓ 找到save-word中的文件: {docx_path_for_processing}")
        else:
            print("⚠ 在save-word中未找到转换后的文件")
            docx_path_for_processing = converted_temp_path
            
    except Exception as e:
        print(f"✗ 转换失败: {e}")
        return
    
    # 清理测试文件
    try:
        os.remove(upload_path)
        print(f"✓ 清理测试文件: {upload_path}")
    except Exception as e:
        print(f"⚠ 清理测试文件失败: {e}")

if __name__ == '__main__':
    test_web_upload_simulation() 