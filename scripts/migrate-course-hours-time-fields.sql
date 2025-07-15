-- 迁移course_hours表的时间字段类型
-- 将start_time和end_time从timestamp改为varchar以支持存储周几和时间段

-- 1. 备份现有数据（可选）
-- CREATE TABLE course_hours_backup AS SELECT * FROM course_hours;

-- 2. 删除现有的时间字段
ALTER TABLE course_hours DROP COLUMN IF EXISTS start_time;
ALTER TABLE course_hours DROP COLUMN IF EXISTS end_time;

-- 3. 添加新的varchar类型时间字段
ALTER TABLE course_hours ADD COLUMN start_time VARCHAR(50); -- 存储周几，如"周一"
ALTER TABLE course_hours ADD COLUMN end_time VARCHAR(100);  -- 存储时间段，如"上午1-2节"

-- 4. 添加注释
COMMENT ON COLUMN course_hours.start_time IS '存储周几，如"周一"、"周二"等';
COMMENT ON COLUMN course_hours.end_time IS '存储时间段，如"上午1-2节"、"下午3-4节"等';

-- 5. 如果需要设置默认值（可选）
-- UPDATE course_hours SET start_time = '周一', end_time = '上午1-2节' WHERE start_time IS NULL; 