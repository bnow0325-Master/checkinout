import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 설정 파일. 마이그레이션/시드용 연결 URL과 seed 명령을 여기서 관리한다.
// (런타임 연결은 src/lib/prisma.ts의 드라이버 어댑터가 담당)
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
