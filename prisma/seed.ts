import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = [
    { code: "1001", name: "김철수", department: "개발팀" },
    { code: "1002", name: "이영희", department: "디자인팀" },
    { code: "1003", name: "박민수", department: "영업팀" },
  ];

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { code: e.code },
      update: {},
      create: e,
    });
  }

  console.log(`Seeded ${employees.length} employees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
