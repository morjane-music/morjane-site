import { createPrivateAccessLoginHandler } from "./_shared/private-access-handler.mjs";

export const createSetAuthHandler = (dependencies = {}) => createPrivateAccessLoginHandler("set", dependencies);
export default createSetAuthHandler();

export const config = { path: "/api/set-auth", method: "POST" };
