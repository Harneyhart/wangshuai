#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用示例：手动调用doc到docx转换功能
"""

import os
from app import convert_doc_to_docx, convert_doc_to_docx_alternative

def example_usage():
    """使用示例"""
    
    # 示例1：使用LibreOffice转换
    print("示例1：使用LibreOffice转换")
    print("-" * 40)
    
    # 假设有一个test.doc文件在uploads目录
    test_file = "uploads/test.doc"
    
    if os.path.exists(test_file):
        try:
            converted_file = convert_doc_to_docx(test_file)
            print(f"✓ 转换成功: {converted_file}")
            
            # 检查save-word目录
            save_files = [f for f in os.listdir('save-word') if f.endswith('.docx')]
            print(f"✓ save-word目录中的文件: {save_files}")
            
        except Exception as e:
            print(f"✗ 转换失败: {e}")
    else:
        print(f"文件不存在: {test_file}")
    
    print("\n" + "="*50 + "\n")
    
    # 示例2：使用备用转换方法
    print("示例2：使用备用转换方法")
    print("-" * 40)
    
    if os.path.exists(test_file):
        try:
            converted_file = convert_doc_to_docx_alternative(test_file)
            print(f"✓ 备用转换成功: {converted_file}")
            
            # 检查save-word目录
            save_files = [f for f in os.listdir('save-word') if f.endswith('.docx')]
            print(f"✓ save-word目录中的文件: {save_files}")
            
        except Exception as e:
            print(f"✗ 备用转换失败: {e}")
    else:
        print(f"文件不存在: {test_file}")

def list_saved_files():
    """列出保存的文件"""
    print("\n保存的文件列表:")
    print("-" * 40)
    
    if os.path.exists('save-word'):
        files = os.listdir('save-word')
        docx_files = [f for f in files if f.endswith('.docx')]
        
        if docx_files:
            for i, file in enumerate(docx_files, 1):
                file_path = os.path.join('save-word', file)
                file_size = os.path.getsize(file_path)
                print(f"{i}. {file} ({file_size} bytes)")
        else:
            print("没有找到保存的docx文件")
    else:
        print("save-word目录不存在")

if __name__ == '__main__':
    # 确保目录存在
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    if not os.path.exists('save-word'):
        os.makedirs('save-word')
    
    example_usage()
    list_saved_files() 