import type { Bank } from "./types";

/**
 * Перечень банков — публичный факт и проверяется легко.
 * Ставки и условия продуктов, в отличие от него, требуют сверки: см. deposits.ts.
 */
export const BANKS: readonly Bank[] = [
  {
    id: "kaspi",
    name: "Kaspi Bank",
    legalName: "АО «Kaspi Bank»",
    kind: "bvu",
    siteUrl: "https://kaspi.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "halyk",
    name: "Halyk Bank",
    legalName: "АО «Народный Банк Казахстана»",
    kind: "bvu",
    siteUrl: "https://halykbank.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "freedom",
    name: "Freedom Bank",
    legalName: "АО «Freedom Bank Kazakhstan»",
    kind: "bvu",
    siteUrl: "https://bankffin.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "jusan",
    name: "Jusan Bank",
    legalName: "АО «First Heartland Jusan Bank»",
    kind: "bvu",
    siteUrl: "https://jusan.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "forte",
    name: "ForteBank",
    legalName: "АО «ForteBank»",
    kind: "bvu",
    siteUrl: "https://forte.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "bcc",
    name: "Bank CenterCredit",
    legalName: "АО «Банк ЦентрКредит»",
    kind: "bvu",
    siteUrl: "https://www.bcc.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "bereke",
    name: "Bereke Bank",
    legalName: "АО «Bereke Bank»",
    kind: "bvu",
    siteUrl: "https://berekebank.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "altyn",
    name: "Altyn Bank",
    legalName: "АО «Altyn Bank»",
    kind: "bvu",
    siteUrl: "https://altynbank.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "eurasian",
    name: "Евразийский банк",
    legalName: "АО «Евразийский банк»",
    kind: "bvu",
    siteUrl: "https://eubank.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "homecredit",
    name: "Home Credit Bank",
    legalName: "АО «Банк Хоум Кредит»",
    kind: "bvu",
    siteUrl: "https://home.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
  {
    id: "rbk",
    name: "Bank RBK",
    legalName: "АО «Bank RBK»",
    kind: "bvu",
    siteUrl: "https://bankrbk.kz",
    isKdifMember: true,
    verifiedAt: "2026-08-17",
  },
];

export function bankById(id: string): Bank | undefined {
  return BANKS.find((b) => b.id === id);
}

export function bankName(id: string): string {
  return bankById(id)?.name ?? id;
}
