const drawings = {
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  jump: '<path d="M12 17V4m-5 5 5-5 5 5M5 21h14"/>',
  sit: '<path d="M5 10V4h14v6M3 11v4h18v-4M6 15v6m12-6v6M3 11h18"/>',
  stand: '<circle cx="12" cy="4" r="2"/><path d="M12 7v7m-5-5 5 2 5-2m-5 5-4 7m4-7 4 7"/>',
  talk: '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2ZM7 9h10M7 13h6"/>',
  gallery: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  hug: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 2 10 8 15 6-5 13-10 8-15Z"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  skip: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  continue: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
};

export function setButtonIcon(button: HTMLButtonElement, icon: keyof typeof drawings, label: string) {
  if (button.dataset.icon === icon && button.getAttribute("aria-label") === label) return;
  if (button.dataset.icon !== icon) {
    // Only our static SVG markup enters HTML; editable copy remains plain text.
    button.innerHTML = `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${drawings[icon]}</svg><span class="button-label"></span>`;
    button.dataset.icon = icon;
  }
  button.querySelector(".button-label")!.textContent = label;
  button.setAttribute("aria-label",label);
  button.title = label;
  button.classList.toggle("icon-only",icon !== "skip");
}
