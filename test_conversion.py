#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试doc到docx转换功能
"""

import os
import sys
from app import convert_doc_to_docx, convert_doc_to_docx_alternative

def test_conversion():
    """测试doc到docx转换"""
    
    # 检查是否有测试文件
    test_files = []
    for file in os.listdir('uploads'):
        if file.endswith('.doc'):
            test_files.append(os.path.join('uploads', file))
    
    if not test_files:
        print("在uploads目录中没有找到.doc文件")
        print("请将测试用的.doc文件放入uploads目录")
        return
    
    print(f"找到 {len(test_files)} 个测试文件:")
    for file in test_files:
        print(f"  - {file}")
    
    # 测试每个文件
    for test_file in test_files:
        print(f"\n{'='*50}")
        print(f"测试文件: {test_file}")
        print(f"{'='*50}")
        
        try:
            # 测试主要转换方法
            print("1. 测试LibreOffice转换...")
            converted_file = convert_doc_to_docx(test_file)
            print(f"✓ 转换成功: {converted_file}")
            
            # 验证转换后的文件
            if os.path.exists(converted_file):
                file_size = os.path.getsize(converted_file)
                print(f"✓ 转换后文件大小: {file_size} bytes")
                
                # 检查save-word目录
                save_files = [f for f in os.listdir('save-word') if f.endswith('.docx')]
                print(f"✓ save-word目录中的docx文件: {save_files}")
            else:
                print("✗ 转换后的文件不存在")
                
        except Exception as e:
            print(f"✗ 转换失败: {e}")
            
            # 尝试备用方法
            try:
                print("2. 测试备用转换方法...")
                converted_file = convert_doc_to_docx_alternative(test_file)
                print(f"✓ 备用转换成功: {converted_file}")
                
                # 验证转换后的文件
                if os.path.exists(converted_file):
                    file_size = os.path.getsize(converted_file)
                    print(f"✓ 转换后文件大小: {file_size} bytes")
                    
                    # 检查save-word目录
                    save_files = [f for f in os.listdir('save-word') if f.endswith('.docx')]
                    print(f"✓ save-word目录中的docx文件: {save_files}")
                else:
                    print("✗ 转换后的文件不存在")
                    
            except Exception as e2:
                print(f"✗ 备用转换也失败: {e2}")

if __name__ == '__main__':
    # 确保目录存在
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    if not os.path.exists('save-word'):
        os.makedirs('save-word')
    
    test_conversion() 