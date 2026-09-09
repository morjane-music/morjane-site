import { createPrivateAccessLoginHandler } from "./_shared/private-access-handler.mjs";

export const createActe1AuthHandler = (dependencies = {}) => createPrivateAccessLoginHandler("acte1", dependencies);
export default createActe1AuthHandler();

export const config = { path: "/api/acte1-auth", method: "POST" };
