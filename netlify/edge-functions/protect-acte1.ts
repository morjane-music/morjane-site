import { createPrivateAccessProtector } from "./_shared/private-access-protect.mjs";

const pagePaths = new Set(["/acte1", "/acte1.html", "/fissure"]);
export const createActe1Protector = (dependencies = {}) => createPrivateAccessProtector({ scope: "acte1", pagePaths, dependencies });
export default createActe1Protector();

export const config = {
  path: ["/acte1", "/acte1.html", "/fissure", "/acte1.css", "/assets/photo-hero-acte1.png"],
  onError: "fail"
};
