#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试特定文件的转换
"""

import os
import sys
from app import convert_doc_to_docx, convert_doc_to_docx_alternative

def test_specific_file():
    """测试特定文件的转换"""
    
    # 测试文件路径
    test_file = r"E:\809\合同模板及对齐需求\保密协议\保密协议模板.doc"
    
    print(f"测试文件: {test_file}")
    
    # 检查文件是否存在
    if not os.path.exists(test_file):
        print(f"✗ 文件不存在: {test_file}")
        return
    
    # 检查文件大小
    file_size = os.path.getsize(test_file)
    print(f"文件大小: {file_size} bytes")
    
    # 检查文件权限
    try:
        with open(test_file, 'rb') as f:
            f.read(1024)  # 读取前1KB测试权限
        print("✓ 文件可读")
    except Exception as e:
        print(f"✗ 文件读取失败: {e}")
        return
    
    # 测试主要转换方法
    print("\n=== 测试LibreOffice转换 ===")
    try:
        converted_file = convert_doc_to_docx(test_file)
        print(f"✓ 转换成功: {converted_file}")
        
        if os.path.exists(converted_file):
            converted_size = os.path.getsize(converted_file)
            print(f"✓ 转换后文件大小: {converted_size} bytes")
        else:
            print("✗ 转换后的文件不存在")
            
    except Exception as e:
        print(f"✗ LibreOffice转换失败: {e}")
        
        # 测试备用方法
        print("\n=== 测试备用转换方法 ===")
        try:
            converted_file = convert_doc_to_docx_alternative(test_file)
            print(f"✓ 备用转换成功: {converted_file}")
            
            if os.path.exists(converted_file):
                converted_size = os.path.getsize(converted_file)
                print(f"✓ 转换后文件大小: {converted_size} bytes")
            else:
                print("✗ 转换后的文件不存在")
                
        except Exception as e2:
            print(f"✗ 备用转换也失败: {e2}")
    
    # 检查save-word目录
    print("\n=== 检查save-word目录 ===")
    save_word_dir = 'save-word'
    if os.path.exists(save_word_dir):
        files = os.listdir(save_word_dir)
        if files:
            print("save-word目录中的文件:")
            for file in files:
                file_path = os.path.join(save_word_dir, file)
                if os.path.isfile(file_path):
                    size = os.path.getsize(file_path)
                    print(f"  - {file} ({size} bytes)")
        else:
            print("save-word目录为空")
    else:
        print("save-word目录不存在")

if __name__ == '__main__':
    test_specific_file() 