"use client";

import { useMemo } from "react";
import {
  MCC_CODES,
  SPEND_GROUP_LABELS,
  SPEND_GROUP_ORDER,
  mccByCode,
  mccInGroup,
} from "@/data/mcc";
import type { SpendGroupId } from "@/data/types";
import { Select } from "@/components/ui/inputs";

/**
 * Выбор категории в два шага: сначала группа, потом код.
 *
 * Одним списком это не работает: кодов почти две сотни, и плоский `select`
 * превращается в свиток. Группа сама по себе ни на что не влияет — она нужна
 * только чтобы дойти до кода за два клика.
 */

const NONE = "";

export function MccField({
  value,
  onChange,
  allowEmpty = false,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  allowEmpty?: boolean;
  id?: string;
}) {
  const group: SpendGroupId = useMemo(
    () => mccByCode(value)?.groupId ?? SPEND_GROUP_ORDER[0],
    [value],
  );

  const codes = useMemo(() => mccInGroup(group), [group]);

  const groupOptions = SPEND_GROUP_ORDER.map((g) => ({ value: g, label: SPEND_GROUP_LABELS[g] }));

  const codeOptions = [
    ...(allowEmpty ? [{ value: NONE, label: "Не указана" }] : []),
    ...codes.map((m) => ({ value: m.code, label: `${m.code} · ${m.name}` })),
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="min-w-0 sm:w-2/5">
        <Select
          value={group}
          onChange={(g) => {
            // При смене группы берём её первый код: пустой выбор оставил бы
            // поле в состоянии, из которого не видно, что делать дальше.
            const first = mccInGroup(g)[0];
            if (first) onChange(first.code);
          }}
          options={groupOptions}
        />
      </div>
      <div className="min-w-0 flex-1">
        <Select id={id} value={value} onChange={onChange} options={codeOptions} />
      </div>
    </div>
  );
}

/** Код и название одной строкой — «5411 · Супермаркеты». */
export function MccLabel({ code }: { code?: string }) {
  if (code === undefined) return <span className="text-faint">категория не определена</span>;
  const entry = mccByCode(code);
  return (
    <span className="tabular">
      {code}
      {entry && <span className="tabular-none"> · {entry.name}</span>}
    </span>
  );
}

export { MCC_CODES };
