import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // В домашнем каталоге пользователя лежит посторонний package-lock.json, и Turbopack
  // иначе принимает его за корень workspace. Фиксируем корень явно.
  turbopack: {
    root: process.cwd(),
  },

  // cacheComponents намеренно не включается: серверных данных в приложении нет,
  // справочники — статические модули, личные данные живут в браузере.
  // Кэш-машинерия здесь не даст ничего, кроме лишних ограничений на пререндер.
};

export default nextConfig;
