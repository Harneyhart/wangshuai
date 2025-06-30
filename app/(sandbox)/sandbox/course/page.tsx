import { Breadcrumb, Tabs } from "antd";

const Timetable = () => {
  return (
    <div className="App">
      <Breadcrumb items={[{ title: '我的课程' }]} />
      <Tabs
        className="!mt-8"
        defaultActiveKey="1"
        items={[
          {
            label: '本学期',
            key: '1',
            children: 'Tab 1',
          },
          {
            label: '过去学期',
            key: '2',
            children: 'Tab 2',
          },
        ]}
      />
    </div>
  );
};

export default Timetable;
