'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormUploadDragger,
  ProFormRadio,
} from '@ant-design/pro-components';
import { Col, Row, message, Popconfirm, Button, Card } from 'antd';
import type { UploadFile } from 'antd';
import Link from 'next/link';

import {
  createCourse,
  getAllCourses,
  deleteCourse,
  updateCourseById,
} from '@/lib/course/actions';
import type { CreateCourseItem, CoursesWithPlan } from '@/lib/course/actions';
import {
  parseAttachmentToUploadFile,
  parseUploadFileToUpsertUploadFile,
  renderCoverUrl,
} from '@/utils/utils';
import { formConfig } from '@/utils/utils';

type CourseFormProps = Pick<CoursesWithPlan, 'id' | 'name' | 'description'> & {
  cover: UploadFile[];
};
const Course = () => {
  const formCourseRef = useRef<ProFormInstance>();
  const [formCourseData, setFormCourseData] = useState<CourseFormProps>();
  const [list, setList] = useState<CoursesWithPlan[]>([]);
  const [modalCourseVisit, setModalCourseVisit] = useState(false);
  const getData = async () => {
    const data = await getAllCourses();
    setList(data);
  };
  const handleDelete = async (id: string) => {
    const data = await deleteCourse(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleAddCourse = () => {
    setFormCourseData(undefined);
    setModalCourseVisit(true);
  };
  const handleEditCourse = (item: CoursesWithPlan) => {
    setFormCourseData({
      ...item,
      cover: parseAttachmentToUploadFile(item.cover),
    });
    setModalCourseVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddCourse}>
          新建课程
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        {list.map((item, index) => (
          <Col span={8} key={item.id}>
            <Card
              bordered
              size="small"
              cover={
                <img
                  alt="example"
                  className="w-full h-48 object-cover"
                  src={renderCoverUrl(item.cover)}
                />
              }
              actions={[
                <Button
                  key="edit"
                  type="link"
                  onClick={() => handleEditCourse(item)}
                >
                  编辑
                </Button>,
                <Popconfirm
                  key="delete"
                  title="确定要删除？"
                  description=""
                  onConfirm={() => handleDelete(item.id)}
                  // onCancel={cancel}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <h2 className="mb-2 font-bold">{item.name}</h2>
              <p className=" line-clamp-3" title={item.description}>
                {item.description}
              </p>
            </Card>
          </Col>
        ))}
      </Row>

      <ModalForm<CourseFormProps>
        {...formConfig}
        formRef={formCourseRef}
        title="课程"
        open={modalCourseVisit}
        onOpenChange={setModalCourseVisit}
        onInit={() => {
          if (formCourseRef.current) {
            if (formCourseData) {
              formCourseRef.current.setFieldsValue(formCourseData);
            } else {
              formCourseRef.current.resetFields();
            }
          }
        }}
        onFinish={async (values) => {
          console.log(values);

          const cover = parseUploadFileToUpsertUploadFile(values.cover);
          console.log('cover', cover);
          if (values.id) {
            updateCourseById({
              ...values,
              cover,
            });
          } else {
            createCourse({
              ...values,
              cover,
            });
          }

          await getData();
          message.success('提交成功');
          setModalCourseVisit(false);
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText
          width="md"
          name="name"
          required
          label="课程名称"
          tooltip=""
          placeholder="请输入名称"
        />
        <ProFormTextArea
          width="md"
          name="description"
          required
          label="课程介绍"
          placeholder="请输入课程介绍"
          rules={[
            {
              required: true,
              message: '请输入课程介绍',
            },
          ]}
        />
        <ProFormUploadDragger
          width="md"
          label="封面"
          max={1}
          name="cover"
          fieldProps={{
            name: 'file',
          }}
          action="/api/upload"
        />
      </ModalForm>
    </div>
  );
};

export default Course;
