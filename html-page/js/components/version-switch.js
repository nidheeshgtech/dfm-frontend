// Review aid: floating "V1–V5" pill to flip the stage animation
// variant. Only renders when the URL already has ?stage=…, so the live
// page never shows it. Remove this file + its init once a version is
// chosen.
export function initVersionSwitch() {
  const params = new URLSearchParams(window.location.search);
  const current = params.get("stage");
  if (!current || !document.querySelector("[data-stage]")) return;

  const nav = document.createElement("nav");
  nav.className = "version-switch";
  nav.setAttribute("aria-label", "Animation version");

  ["v1", "v2", "v3", "v4", "v5"].forEach((version) => {
    const link = document.createElement("a");
    params.set("stage", version);
    link.href = `?${params.toString()}`;
    link.textContent = version.toUpperCase();
    if (version === current) link.setAttribute("aria-current", "true");
    nav.append(link);
  });

  document.body.append(nav);
}
