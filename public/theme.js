(() => {
  const key = 'macro-evidence-theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function storedPreference() {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
    } catch {
      return 'system';
    }
  }

  function resolvedTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return media.matches ? 'dark' : 'light';
  }

  function updateButtons(preference) {
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
  }

  function apply(preference) {
    root.dataset.theme = resolvedTheme(preference);
    root.dataset.themePreference = preference;
    updateButtons(preference);
  }

  function save(preference) {
    try { localStorage.setItem(key, preference); } catch {}
    apply(preference);
  }

  apply(storedPreference());

  document.addEventListener('DOMContentLoaded', () => {
    updateButtons(storedPreference());
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        save(button.dataset.themeChoice);
      });
    });
  });

  media.addEventListener('change', () => {
    if (storedPreference() === 'system') apply('system');
  });
})();
