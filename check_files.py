#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查uploads目录中的文件
"""

import os
import glob

def check_uploads_directory():
    """检查uploads目录中的文件"""
    
    uploads_dir = 'uploads'
    save_word_dir = 'save-word'
    
    print("=== 检查uploads目录 ===")
    if os.path.exists(uploads_dir):
        files = os.listdir(uploads_dir)
        if files:
            for file in files:
                file_path = os.path.join(uploads_dir, file)
                if os.path.isfile(file_path):
                    size = os.path.getsize(file_path)
                    print(f"  - {file} ({size} bytes)")
                else:
                    print(f"  - {file} (目录)")
        else:
            print("  uploads目录为空")
    else:
        print("  uploads目录不存在")
    
    print("\n=== 检查save-word目录 ===")
    if os.path.exists(save_word_dir):
        files = os.listdir(save_word_dir)
        if files:
            for file in files:
                file_path = os.path.join(save_word_dir, file)
                if os.path.isfile(file_path):
                    size = os.path.getsize(file_path)
                    print(f"  - {file} ({size} bytes)")
                else:
                    print(f"  - {file} (目录)")
        else:
            print("  save-word目录为空")
    else:
        print("  save-word目录不存在")
    
    print("\n=== 查找特定的输出文件 ===")
    # 查找可能的输出文件
    output_patterns = [
        'output_*.docx',
        'output_*.doc',
        'converted_*.docx'
    ]
    
    for pattern in output_patterns:
        files = glob.glob(os.path.join(uploads_dir, pattern))
        if files:
            print(f"找到 {pattern} 文件:")
            for file in files:
                size = os.path.getsize(file)
                print(f"  - {os.path.basename(file)} ({size} bytes)")
        else:
            print(f"未找到 {pattern} 文件")

if __name__ == '__main__':
    check_uploads_directory() 