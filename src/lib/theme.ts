export const THEME_KEY = "finora:theme";

export type Theme = "light" | "dark";

/**
 * Инлайн-скрипт для <head>: выставляет data-theme до первой отрисовки.
 * Без него на тёмной теме на кадр мигает светлый фон.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
