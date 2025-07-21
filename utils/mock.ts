import { fakerZH_CN as faker } from '@faker-js/faker';
faker.seed(123);
type Teacher = {
  key: string;
  name: string;
  email: string;
  department: string;
  title: string;
  qualification: string;
  date: string;
};

function createRandomTeacher(): Teacher {
  return {
    key: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    department: faker.helpers.arrayElement([
      '技术部',
      '产品部',
      '市场部',
      '运营部',
    ]),
    title: faker.helpers.arrayElement(['初级', '中级', '高级']),
    qualification: faker.helpers.arrayElement(['A', 'B', 'C']),
    date: faker.date.past().toISOString().split('T')[0],
  };
}

const createRandomTeachers = (numUsers = 5) => {
  return new Array(numUsers).fill(undefined).map(createRandomTeacher);
};

export const fakeTeachers = createRandomTeachers(50);
