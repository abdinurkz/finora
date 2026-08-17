/**
 * Инлайн-скрипт, который выполняется до первой отрисовки.
 *
 * На сервере тип — `text/javascript`, чтобы браузер выполнил скрипт при разборе
 * HTML. На клиенте — `text/plain`: React в разработке предупреждает о тегах
 * <script> внутри компонентов (при клиентской навигации они всё равно не
 * выполняются), а `suppressHydrationWarning` гасит расхождение по атрибуту type.
 *
 * Приём взят из руководства Next.js «Preventing flash before hydration».
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
