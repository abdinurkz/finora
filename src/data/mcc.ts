import type { MccCode, SpendGroupId } from "./types";

/**
 * ISO 18245 — коды категорий торговых точек.
 *
 * Здесь КУРИРОВАННОЕ подмножество, а не полный стандарт (~1000 кодов).
 * Всё, что осталось за бортом, — опт, госзакупки, авиакомпании поимённо
 * и B2B-услуги: в рознице Казахстана эти коды не встречаются, а список
 * выбора и бандл они бы раздули втрое. Правило включения простое: код
 * достижим либо из предложения банка, либо из обычной траты человека.
 *
 * Названия даны по-русски в том виде, в каком их узнаёт держатель карты,
 * а не дословным переводом стандарта: «Фастфуд», а не «Заведения быстрого
 * обслуживания».
 */

export const SPEND_GROUP_LABELS: Record<SpendGroupId, string> = {
  groceries: "Продукты",
  dining: "Кафе и рестораны",
  transport: "Транспорт",
  fuel: "АЗС",
  auto: "Авто",
  travel: "Путешествия",
  entertainment: "Развлечения",
  digital: "Цифровые товары и подписки",
  home: "Дом и ремонт",
  telecom: "Связь и интернет",
  utilities: "Коммунальные услуги",
  health: "Здоровье",
  beauty: "Красота",
  kids: "Дети",
  clothing: "Одежда и обувь",
  electronics: "Техника и электроника",
  marketplace: "Маркетплейсы и универмаги",
  education: "Образование",
  pets: "Животные",
  services: "Услуги",
  finance: "Финансы и страхование",
  other: "Прочее",
};

export const SPEND_GROUP_ORDER: readonly SpendGroupId[] = [
  "groceries",
  "dining",
  "transport",
  "fuel",
  "auto",
  "travel",
  "entertainment",
  "digital",
  "telecom",
  "utilities",
  "home",
  "health",
  "beauty",
  "kids",
  "clothing",
  "electronics",
  "marketplace",
  "education",
  "pets",
  "services",
  "finance",
  "other",
];

export const MCC_CODES: readonly MccCode[] = [
  /* Продукты */
  { code: "5411", name: "Супермаркеты и продуктовые магазины", groupId: "groceries" },
  { code: "5422", name: "Мясные лавки", groupId: "groceries" },
  { code: "5441", name: "Кондитерские", groupId: "groceries" },
  { code: "5451", name: "Молочные магазины", groupId: "groceries" },
  { code: "5462", name: "Пекарни", groupId: "groceries" },
  { code: "5499", name: "Магазины у дома и продукты навынос", groupId: "groceries" },
  { code: "5921", name: "Алкогольные магазины", groupId: "groceries" },

  /* Кафе и рестораны */
  { code: "5811", name: "Кейтеринг", groupId: "dining" },
  { code: "5812", name: "Рестораны и кафе", groupId: "dining" },
  { code: "5813", name: "Бары и ночные клубы", groupId: "dining" },
  { code: "5814", name: "Фастфуд", groupId: "dining" },

  /* Транспорт */
  { code: "4111", name: "Городской и пригородный транспорт", groupId: "transport" },
  { code: "4112", name: "Железнодорожные перевозки", groupId: "transport" },
  { code: "4121", name: "Такси", groupId: "transport" },
  { code: "4131", name: "Автобусные перевозки", groupId: "transport" },
  { code: "4784", name: "Платные дороги и мосты", groupId: "transport" },
  { code: "4789", name: "Прочие транспортные услуги", groupId: "transport" },
  { code: "7523", name: "Парковки и стоянки", groupId: "transport" },

  /* АЗС */
  { code: "5541", name: "АЗС", groupId: "fuel" },
  { code: "5542", name: "АЗС с автоматической оплатой", groupId: "fuel" },
  { code: "5983", name: "Топливо: уголь, мазут, дрова", groupId: "fuel" },

  /* Авто */
  { code: "5511", name: "Автосалоны", groupId: "auto" },
  { code: "5531", name: "Автотовары", groupId: "auto" },
  { code: "5532", name: "Шинные магазины", groupId: "auto" },
  { code: "5533", name: "Автозапчасти и аксессуары", groupId: "auto" },
  { code: "7531", name: "Кузовной ремонт", groupId: "auto" },
  { code: "7538", name: "Автосервисы", groupId: "auto" },
  { code: "7542", name: "Автомойки", groupId: "auto" },
  { code: "7549", name: "Эвакуаторы и техпомощь", groupId: "auto" },

  /* Путешествия */
  { code: "4411", name: "Круизные линии", groupId: "travel" },
  { code: "4511", name: "Авиабилеты", groupId: "travel" },
  { code: "4722", name: "Турагентства и туроператоры", groupId: "travel" },
  { code: "7011", name: "Отели и гостиницы", groupId: "travel" },
  { code: "7512", name: "Прокат автомобилей", groupId: "travel" },

  /* Развлечения */
  { code: "7832", name: "Кинотеатры", groupId: "entertainment" },
  { code: "7841", name: "Видеопрокат", groupId: "entertainment" },
  { code: "7911", name: "Танцевальные студии", groupId: "entertainment" },
  { code: "7922", name: "Театры, концерты, билетные агентства", groupId: "entertainment" },
  { code: "7929", name: "Оркестры и артисты", groupId: "entertainment" },
  { code: "7932", name: "Бильярд", groupId: "entertainment" },
  { code: "7933", name: "Боулинг", groupId: "entertainment" },
  { code: "7991", name: "Достопримечательности и выставки", groupId: "entertainment" },
  { code: "7993", name: "Товары для видеоигр", groupId: "entertainment" },
  { code: "7994", name: "Игровые залы", groupId: "entertainment" },
  { code: "7996", name: "Парки развлечений и цирки", groupId: "entertainment" },
  { code: "7998", name: "Зоопарки и аквариумы", groupId: "entertainment" },
  { code: "7999", name: "Отдых и развлечения прочее", groupId: "entertainment" },

  /* Цифровые товары и подписки */
  { code: "5815", name: "Цифровые товары: книги, фильмы, музыка", groupId: "digital" },
  { code: "5816", name: "Цифровые товары: игры", groupId: "digital" },
  { code: "5817", name: "Цифровые товары: приложения", groupId: "digital" },
  { code: "5818", name: "Цифровые товары: крупные площадки", groupId: "digital" },
  { code: "5734", name: "Магазины программного обеспечения", groupId: "digital" },
  { code: "7372", name: "Разработка ПО и обработка данных", groupId: "digital" },
  { code: "7379", name: "Компьютерные услуги", groupId: "digital" },

  /* Связь и интернет */
  { code: "4812", name: "Продажа телефонов и оборудования", groupId: "telecom" },
  { code: "4814", name: "Услуги связи и пополнение баланса", groupId: "telecom" },
  { code: "4816", name: "Интернет и информационные услуги", groupId: "telecom" },
  { code: "4899", name: "Кабельное и спутниковое ТВ", groupId: "telecom" },

  /* Коммунальные услуги */
  { code: "4900", name: "Коммунальные услуги: свет, газ, вода", groupId: "utilities" },

  /* Дом и ремонт */
  { code: "1711", name: "Отопление, сантехника, кондиционирование", groupId: "home" },
  { code: "1731", name: "Электромонтажные работы", groupId: "home" },
  { code: "1750", name: "Столярные и отделочные работы", groupId: "home" },
  { code: "1799", name: "Строительные подрядчики прочие", groupId: "home" },
  { code: "5200", name: "Магазины товаров для дома", groupId: "home" },
  { code: "5211", name: "Стройматериалы и пиломатериалы", groupId: "home" },
  { code: "5231", name: "Стекло, краски, обои", groupId: "home" },
  { code: "5251", name: "Хозяйственные магазины", groupId: "home" },
  { code: "5261", name: "Садовые центры", groupId: "home" },
  { code: "5712", name: "Мебель и предметы интерьера", groupId: "home" },
  { code: "5713", name: "Напольные покрытия", groupId: "home" },
  { code: "5714", name: "Ткани, шторы, обивка", groupId: "home" },
  { code: "5719", name: "Товары для дома прочие", groupId: "home" },
  { code: "5722", name: "Бытовая техника", groupId: "home" },
  { code: "7349", name: "Уборка и клининг", groupId: "home" },

  /* Здоровье */
  { code: "5912", name: "Аптеки", groupId: "health" },
  { code: "5975", name: "Слуховые аппараты", groupId: "health" },
  { code: "5976", name: "Ортопедические товары", groupId: "health" },
  { code: "7297", name: "Массажные салоны", groupId: "health" },
  { code: "7298", name: "СПА и оздоровительные центры", groupId: "health" },
  { code: "7997", name: "Фитнес и спортивные клубы", groupId: "health" },
  { code: "8011", name: "Врачи и медицинские центры", groupId: "health" },
  { code: "8021", name: "Стоматологи и ортодонты", groupId: "health" },
  { code: "8031", name: "Остеопаты", groupId: "health" },
  { code: "8042", name: "Оптометристы и офтальмологи", groupId: "health" },
  { code: "8043", name: "Оптика: очки и линзы", groupId: "health" },
  { code: "8049", name: "Прочие медицинские практики", groupId: "health" },
  { code: "8050", name: "Уход за пожилыми", groupId: "health" },
  { code: "8062", name: "Больницы", groupId: "health" },
  { code: "8071", name: "Медицинские лаборатории", groupId: "health" },
  { code: "8099", name: "Медицинские услуги прочие", groupId: "health" },

  /* Красота */
  { code: "5977", name: "Косметика и парфюмерия", groupId: "beauty" },
  { code: "7230", name: "Парикмахерские и салоны красоты", groupId: "beauty" },

  /* Дети */
  { code: "5641", name: "Детская одежда", groupId: "kids" },
  { code: "5945", name: "Игрушки и игры", groupId: "kids" },
  { code: "8351", name: "Детские сады и ясли", groupId: "kids" },

  /* Одежда и обувь */
  { code: "5611", name: "Мужская одежда", groupId: "clothing" },
  { code: "5621", name: "Женская одежда", groupId: "clothing" },
  { code: "5631", name: "Женские аксессуары", groupId: "clothing" },
  { code: "5651", name: "Одежда для всей семьи", groupId: "clothing" },
  { code: "5661", name: "Обувь", groupId: "clothing" },
  { code: "5691", name: "Мужская и женская одежда", groupId: "clothing" },
  { code: "5697", name: "Ателье и пошив", groupId: "clothing" },
  { code: "5699", name: "Одежда и аксессуары прочее", groupId: "clothing" },
  { code: "5944", name: "Ювелирные изделия и часы", groupId: "clothing" },
  { code: "5948", name: "Кожгалантерея и сумки", groupId: "clothing" },

  /* Техника и электроника */
  { code: "5045", name: "Компьютеры и оргтехника", groupId: "electronics" },
  { code: "5732", name: "Электроника", groupId: "electronics" },
  { code: "5733", name: "Музыкальные инструменты", groupId: "electronics" },
  { code: "5735", name: "Музыка и записи", groupId: "electronics" },
  { code: "7622", name: "Ремонт электроники", groupId: "electronics" },
  { code: "7623", name: "Ремонт бытовой техники", groupId: "electronics" },

  /* Маркетплейсы и универмаги */
  { code: "5262", name: "Маркетплейсы", groupId: "marketplace" },
  { code: "5300", name: "Оптовые клубы", groupId: "marketplace" },
  { code: "5310", name: "Дискаунтеры", groupId: "marketplace" },
  { code: "5311", name: "Универмаги", groupId: "marketplace" },
  { code: "5331", name: "Универсальные магазины", groupId: "marketplace" },
  { code: "5399", name: "Товары общего назначения прочие", groupId: "marketplace" },
  { code: "5964", name: "Торговля по каталогам", groupId: "marketplace" },
  { code: "5965", name: "Каталожная и розничная торговля", groupId: "marketplace" },
  { code: "5969", name: "Прямые продажи прочее", groupId: "marketplace" },

  /* Образование */
  { code: "5942", name: "Книжные магазины", groupId: "education" },
  { code: "5943", name: "Канцтовары и офисные принадлежности", groupId: "education" },
  { code: "8211", name: "Школы", groupId: "education" },
  { code: "8220", name: "Вузы и колледжи", groupId: "education" },
  { code: "8241", name: "Заочное обучение", groupId: "education" },
  { code: "8244", name: "Бизнес-школы", groupId: "education" },
  { code: "8249", name: "Профессиональные училища", groupId: "education" },
  { code: "8299", name: "Образовательные услуги прочие", groupId: "education" },

  /* Животные */
  { code: "0742", name: "Ветеринарные услуги", groupId: "pets" },
  { code: "5995", name: "Зоомагазины и корма", groupId: "pets" },

  /* Услуги */
  { code: "5947", name: "Подарки и сувениры", groupId: "services" },
  { code: "5992", name: "Цветы", groupId: "services" },
  { code: "7210", name: "Прачечные и химчистки", groupId: "services" },
  { code: "7221", name: "Фотостудии", groupId: "services" },
  { code: "7251", name: "Ремонт обуви", groupId: "services" },
  { code: "7261", name: "Похоронные услуги", groupId: "services" },
  { code: "7277", name: "Консультационные услуги", groupId: "services" },
  { code: "7299", name: "Бытовые услуги прочие", groupId: "services" },
  { code: "7338", name: "Копировальные услуги", groupId: "services" },
  { code: "7342", name: "Дезинсекция и дезинфекция", groupId: "services" },
  { code: "7361", name: "Кадровые агентства", groupId: "services" },
  { code: "7399", name: "Бизнес-услуги прочие", groupId: "services" },
  { code: "7631", name: "Ремонт часов и ювелирных изделий", groupId: "services" },
  { code: "7641", name: "Реставрация мебели", groupId: "services" },
  { code: "7699", name: "Ремонтные услуги прочие", groupId: "services" },

  /* Финансы и страхование */
  { code: "4829", name: "Денежные переводы", groupId: "finance", excludedFromCashback: true },
  { code: "6010", name: "Выдача наличных в отделении", groupId: "finance", excludedFromCashback: true },
  { code: "6011", name: "Снятие наличных в банкомате", groupId: "finance", excludedFromCashback: true },
  { code: "6012", name: "Финансовые услуги и платежи", groupId: "finance", excludedFromCashback: true },
  { code: "6051", name: "Квазикэш и обмен валюты", groupId: "finance", excludedFromCashback: true },
  { code: "6211", name: "Ценные бумаги и брокеры", groupId: "finance", excludedFromCashback: true },
  { code: "6300", name: "Страхование", groupId: "finance" },
  { code: "9211", name: "Судебные издержки", groupId: "finance", excludedFromCashback: true },
  { code: "9222", name: "Штрафы", groupId: "finance", excludedFromCashback: true },
  { code: "9311", name: "Налоговые платежи", groupId: "finance", excludedFromCashback: true },
  { code: "9399", name: "Государственные услуги", groupId: "finance" },

  /* Прочее */
  { code: "5940", name: "Велосипеды", groupId: "other" },
  { code: "5941", name: "Спорттовары", groupId: "other" },
  { code: "5946", name: "Фототовары", groupId: "other" },
  { code: "5970", name: "Товары для творчества", groupId: "other" },
  { code: "5971", name: "Галереи и предметы искусства", groupId: "other" },
  { code: "5993", name: "Табачные магазины", groupId: "other" },
  { code: "5994", name: "Газетные киоски", groupId: "other" },
  { code: "5999", name: "Розничные магазины прочие", groupId: "other" },
  { code: "8398", name: "Благотворительные организации", groupId: "other" },
  { code: "8641", name: "Общественные организации", groupId: "other" },
  { code: "8661", name: "Религиозные организации", groupId: "other" },
  { code: "8675", name: "Автомобильные клубы", groupId: "other" },
  { code: "8699", name: "Членские организации прочие", groupId: "other" },
];

const BY_CODE = new Map(MCC_CODES.map((m) => [m.code, m]));

export function mccByCode(code: string): MccCode | undefined {
  return BY_CODE.get(code);
}

/** Название кода, а если такого нет в каталоге — сам код. */
export function mccName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function mccInGroup(groupId: SpendGroupId): MccCode[] {
  return MCC_CODES.filter((m) => m.groupId === groupId);
}

/** Поиск для пикера: по номеру кода, названию категории и названию группы. */
export function searchMcc(query: string): MccCode[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...MCC_CODES];

  return MCC_CODES.filter(
    (m) =>
      m.code.startsWith(q) ||
      m.name.toLowerCase().includes(q) ||
      SPEND_GROUP_LABELS[m.groupId].toLowerCase().includes(q),
  );
}

/**
 * Начисляют ли по коду кэшбэк в принципе.
 * Неизвестный код считаем годным: каталог не полон, и молчаливый отказ
 * по незнакомой категории вводил бы в заблуждение сильнее, чем лишняя строка.
 */
export function isCashbackEligible(code: string): boolean {
  return BY_CODE.get(code)?.excludedFromCashback !== true;
}
