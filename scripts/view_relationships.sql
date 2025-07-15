-- 查看所有表的外键关系
SELECT 
    tc.table_name as "表名",
    kcu.column_name as "外键列",
    ccu.table_name AS "引用表",
    ccu.column_name AS "引用列",
    tc.constraint_name as "约束名"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 查看所有表的基本信息
SELECT 
    table_name as "表名",
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as "列数"
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 查看特定表的外键关系（以attachments表为例）
SELECT 
    tc.table_name as "表名",
    kcu.column_name as "外键列",
    ccu.table_name AS "引用表",
    ccu.column_name AS "引用列"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'attachments' OR ccu.table_name = 'attachments')
ORDER BY tc.table_name, kcu.column_name; 