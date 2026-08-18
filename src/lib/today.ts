import type { CivilDate } from "@/domain/time";

const TIME_ZONE = "Asia/Almaty";

export function todayCivil(now: Date = new Date()): CivilDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
