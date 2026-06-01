export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem('bs_theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
`.trim();
