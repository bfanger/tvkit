console.info("@vite/client [TVKit]");

export function createHotContext() {
  return {
    accept() {},
    prune() {},
    dispose() {},
    on() {},
  };
}
export function injectQuery(...args) {
  console.warn("[tvkit] injectQuery not supported", args);
}
export function removeStyle(...args) {
  console.warn("[tvkit] removeStyle not supported", args);
}
export function updateStyle(id, css) {
  const s = document.createElement("style");
  s.innerHTML = css;
  s.setAttribute("data-vite-id", id);
  document.head.appendChild(s);
}
