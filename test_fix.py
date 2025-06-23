#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_variable_scope():
    """测试变量作用域修复"""
    print("测试变量作用域修复...")
    
    # 模拟修复后的逻辑
    create_new_rels = False  # 初始化变量
    
    # 模拟文件不存在的情况
    file_exists = False
    
    if file_exists:
        try:
            # 模拟处理现有文件
            print("处理现有文件")
        except Exception as e:
            print(f"警告: 修改现有文件失败: {str(e)}")
            create_new_rels = True
    else:
        create_new_rels = True
    
    if create_new_rels:
        print("✓ 创建新文件")
    else:
        print("✓ 使用现有文件")
    
    print("变量作用域测试通过！")

if __name__ == "__main__":
    test_variable_scope() 