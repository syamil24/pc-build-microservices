type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isField(target: EventTarget | null): target is Field {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

const linkError = (el: Field, shown: boolean) => {
  const errorId = el.dataset.error;
  if (!errorId) return;
  const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== errorId);
  if (shown) ids.push(errorId);
  if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
  else el.removeAttribute("aria-describedby");
};

const announcer = document.createElement("div");
announcer.id = "form-announcer";
announcer.setAttribute("aria-live", "polite");
announcer.className = "visually-hidden";
if (!document.getElementById("form-announcer")) document.body.append(announcer);

let announceTimer = 0;
let announcedField: Field | null = null;

const spokenText = (node: HTMLElement) => {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden='true']").forEach((child) => child.remove());
  copy.querySelectorAll("[role='img'][aria-label]").forEach((child) => {
    child.replaceWith(`${child.getAttribute("aria-label")}: `);
  });
  return (copy.textContent || "").replace(/\s+/g, " ").trim();
};

const announceError = (el: Field) => {
  const errorId = el.dataset.error;
  const error = errorId ? document.getElementById(errorId) : null;
  if (!error) return;
  const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : "";
  window.clearTimeout(announceTimer);
  announcer.textContent = "";
  announcedField = el;
  announceTimer = window.setTimeout(() => {
    announcer.textContent = label + spokenText(error);
  }, 500);
};

const flagged = new WeakSet<Field>();
const announced = new WeakSet<Field>();

const syncAria = (el: Field, announce = false) => {
  const invalid = el.matches(":user-invalid");
  if (invalid) {
    if (announce && !announced.has(el)) {
      announceError(el);
      announced.add(el);
    }
    el.setAttribute("aria-invalid", "true");
    linkError(el, true);
    flagged.add(el);
  } else if (flagged.has(el) || el.getAttribute("aria-invalid") !== "true") {
    el.setAttribute("aria-invalid", "false");
    linkError(el, false);
    flagged.delete(el);
    announced.delete(el);
    if (announcedField === el) {
      window.clearTimeout(announceTimer);
      announcer.textContent = "";
    }
  }
};

const watch = (el: Element) => {
  if (!isField(el) || el.hasAttribute("aria-invalid")) return;
  syncAria(el);
};

document.querySelectorAll("input, select, textarea").forEach(watch);
const observer = new MutationObserver((records) => {
  for (const record of records) {
    record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      watch(node);
      node.querySelectorAll("input, select, textarea").forEach(watch);
    });
  }
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener("blur", (event) => {
  if (isField(event.target)) syncAria(event.target, true);
}, true);

document.addEventListener("input", (event) => {
  if (isField(event.target) && event.target.hasAttribute("aria-invalid")) syncAria(event.target);
});

document.addEventListener("change", (event) => {
  if (isField(event.target)) syncAria(event.target, true);
}, true);

document.addEventListener("invalid", (event) => {
  if (!isField(event.target)) return;
  announced.add(event.target);
  syncAria(event.target);
}, true);

document.addEventListener("reset", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  window.setTimeout(() => {
    [...form.elements].forEach((el) => {
      if (isField(el)) syncAria(el);
    });
  });
}, true);
