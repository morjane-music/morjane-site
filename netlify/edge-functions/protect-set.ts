import { createPrivateAccessProtector } from "./_shared/private-access-protect.mjs";

const pagePaths = new Set(["/set", "/set.html"]);
export const createSetProtector = (dependencies = {}) => createPrivateAccessProtector({ scope: "set", pagePaths, dependencies });
export default createSetProtector();

export const config = {
  path: ["/set", "/set.html", "/set.css", "/set.js", "/assets/images/set/*", "/assets/set-private/*", "/assets/epk/Morjane-Fiche-Technique.html"],
  onError: "fail"
};
