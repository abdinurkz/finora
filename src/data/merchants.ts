import type { Merchant } from "./types";

/**
 * Мерчанты существуют ради одного: человек не должен знать, что такое MCC.
 * Он пишет «Netflix» или «Small», а код подставляется сам — и подписка
 * сразу попадает в подбор кэшбэка.
 *
 * Здесь только те, кого реально встречаешь в выписке казахстанца: сети из
 * месячных подборок банков, крупная розница и вендоры подписок. Это не
 * реестр юрлиц, и полнота тут недостижима — список пополняется по мере
 * появления в предложениях.
 */
export const MERCHANTS: readonly Merchant[] = [
  /* Продукты */
  { id: "small", name: "Small", mcc: "5411", aliases: ["смолл"] },
  { id: "spar", name: "Spar", mcc: "5411", aliases: ["спар"] },
  { id: "magnum", name: "Magnum", mcc: "5411", aliases: ["магнум"] },
  { id: "galmart", name: "Galmart", mcc: "5411", aliases: ["галмарт"] },
  { id: "arbuz", name: "Arbuz.kz", mcc: "5411", aliases: ["arbuz", "арбуз"], siteUrl: "https://arbuz.kz" },
  { id: "airba-fresh", name: "Airba Fresh", mcc: "5411", aliases: ["airba"] },

  /* Доставка еды */
  { id: "wolt", name: "Wolt", mcc: "5814", aliases: ["волт"] },
  { id: "glovo", name: "Glovo", mcc: "5814", aliases: ["глово"] },
  { id: "chocofood", name: "Chocofood", mcc: "5814", aliases: ["чокофуд"] },
  { id: "yandex-eda", name: "Яндекс Еда", mcc: "5814", aliases: ["yandex eda"] },

  /* Техника и маркетплейсы */
  { id: "sulpak", name: "Sulpak", mcc: "5732", aliases: ["сулпак"], siteUrl: "https://www.sulpak.kz" },
  { id: "technodom", name: "Technodom", mcc: "5732", aliases: ["технодом"] },
  { id: "mechta", name: "Mechta", mcc: "5732", aliases: ["мечта"] },
  { id: "kaspi-shop", name: "Kaspi Магазин", mcc: "5262", aliases: ["kaspi shop"] },
  { id: "wildberries", name: "Wildberries", mcc: "5262", aliases: ["вайлдберриз", "wb"] },
  { id: "ozon", name: "Ozon", mcc: "5262", aliases: ["озон"] },
  { id: "forte-market", name: "Forte Market", mcc: "5262", aliases: ["фортемаркет"] },
  { id: "halyk-market", name: "Halyk Market", mcc: "5262" },

  /* Книги и канцтовары */
  { id: "marwin", name: "Marwin", mcc: "5942", aliases: ["марвин"] },
  { id: "meloman", name: "Meloman", mcc: "5942", aliases: ["меломан"] },
  { id: "flip-kz", name: "Flip.kz", mcc: "5942", aliases: ["flip", "флип"], siteUrl: "https://flip.kz" },

  /* Ювелирные */
  { id: "lucente", name: "Lucente", mcc: "5944", aliases: ["лученте"] },

  /* Транспорт */
  { id: "onay", name: "ONAY", mcc: "4111", aliases: ["онай", "onay!"] },
  { id: "avtobys", name: "Avtobys", mcc: "4111", aliases: ["автобус"] },
  { id: "tulparcard", name: "TulparCard", mcc: "4111", aliases: ["тулпар", "tulpar"] },
  { id: "alempay", name: "AlemPay", mcc: "4111", aliases: ["алемпей"] },
  { id: "kokshe-bus", name: "Kokshe Bus Tolem", mcc: "4111", aliases: ["kokshe bus", "кокше"] },
  { id: "qazavtojol", name: "QazAvtoJol", mcc: "4784", aliases: ["казавтожол", "qaz avto jol"] },
  { id: "yandex-go", name: "Яндекс Go", mcc: "4121", aliases: ["yandex go", "яндекс такси"] },
  { id: "indriver", name: "inDrive", mcc: "4121", aliases: ["индрайв", "indriver"] },

  /* Услуги */
  { id: "naimi", name: "Naimi", mcc: "7299", aliases: ["найми"] },

  /* Связь */
  { id: "activ", name: "Activ", mcc: "4814", aliases: ["актив"] },
  { id: "kcell", name: "Kcell", mcc: "4814", aliases: ["кселл"] },
  { id: "beeline-kz", name: "Beeline Казахстан", mcc: "4814", aliases: ["beeline", "билайн"] },
  { id: "tele2", name: "Tele2", mcc: "4814", aliases: ["теле2"] },
  { id: "altel", name: "Altel", mcc: "4814", aliases: ["алтел"] },
  { id: "kazakhtelecom", name: "Казахтелеком", mcc: "4814", aliases: ["kazakhtelecom", "id net"] },

  /* Подписки: видео и музыка */
  { id: "netflix", name: "Netflix", mcc: "5815", aliases: ["нетфликс"] },
  { id: "spotify", name: "Spotify", mcc: "5815", aliases: ["спотифай"] },
  { id: "youtube-premium", name: "YouTube Premium", mcc: "5815", aliases: ["youtube", "ютуб"] },
  { id: "yandex-plus", name: "Яндекс Плюс", mcc: "5815", aliases: ["yandex plus"] },
  { id: "ivi", name: "ivi", mcc: "5815", aliases: ["иви"] },
  { id: "kinopoisk", name: "Кинопоиск", mcc: "5815", aliases: ["kinopoisk"] },
  { id: "apple-music", name: "Apple Music", mcc: "5815" },

  /* Подписки: игры */
  { id: "steam", name: "Steam", mcc: "5816", aliases: ["стим"] },
  { id: "playstation", name: "PlayStation", mcc: "5816", aliases: ["ps plus", "плейстейшн"] },
  { id: "xbox", name: "Xbox", mcc: "5816", aliases: ["game pass"] },

  /* Подписки: приложения и сервисы */
  { id: "apple", name: "Apple", mcc: "5817", aliases: ["icloud", "app store", "apple one"] },
  { id: "google", name: "Google", mcc: "5817", aliases: ["google one", "google play"] },
  { id: "telegram", name: "Telegram Premium", mcc: "5817", aliases: ["telegram", "телеграм"] },
  { id: "openai", name: "OpenAI", mcc: "5817", aliases: ["chatgpt", "чатгпт"] },
  { id: "anthropic", name: "Anthropic", mcc: "5817", aliases: ["claude"] },
  { id: "duolingo", name: "Duolingo", mcc: "5817", aliases: ["дуолинго"] },

  /* Подписки: софт */
  { id: "adobe", name: "Adobe", mcc: "5734", aliases: ["creative cloud", "адоб"] },
  { id: "microsoft", name: "Microsoft 365", mcc: "5734", aliases: ["microsoft", "office 365"] },
  { id: "notion", name: "Notion", mcc: "5734", aliases: ["ноушн"] },
  { id: "figma", name: "Figma", mcc: "5734", aliases: ["фигма"] },
  { id: "github", name: "GitHub", mcc: "7372", aliases: ["гитхаб"] },

  /* Обучение */
  { id: "coursera", name: "Coursera", mcc: "8299", aliases: ["курсера"] },
  { id: "skillbox", name: "Skillbox", mcc: "8299", aliases: ["скиллбокс"] },
];

const BY_ID = new Map(MERCHANTS.map((m) => [m.id, m]));

export function merchantById(id: string): Merchant | undefined {
  return BY_ID.get(id);
}

/** Приводит строку к словам: нижний регистр, пунктуация — в пробелы. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Ищем мерчанта в названии платежа.
 *
 * Сравнение идёт по ЦЕЛЫМ словам, а не подстрокой: иначе «Small» находился бы
 * внутри «Smallville», а «ivi» — внутри «Privilege». Поэтому и название,
 * и написания разбиваются на слова, и совпасть должна вся последовательность
 * подряд.
 *
 * Из нескольких совпадений выигрывает самое длинное: «Яндекс Плюс» точнее,
 * чем «Яндекс Go», когда в строке есть оба слова.
 */
export function suggestMerchant(text: string): Merchant | undefined {
  const words = tokenize(text);
  if (words.length === 0) return undefined;

  let best: Merchant | undefined;
  let bestLength = 0;

  for (const merchant of MERCHANTS) {
    const candidates = [merchant.name, ...(merchant.aliases ?? [])];

    for (const candidate of candidates) {
      const needle = tokenize(candidate);
      if (needle.length === 0 || needle.length < bestLength) continue;

      for (let i = 0; i + needle.length <= words.length; i++) {
        if (needle.every((w, j) => words[i + j] === w)) {
          best = merchant;
          bestLength = needle.length;
          break;
        }
      }
    }
  }

  return best;
}
