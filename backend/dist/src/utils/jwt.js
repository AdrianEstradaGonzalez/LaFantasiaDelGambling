import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "dev";
export function signAccess(sub, email) {
    return jwt.sign({ sub, email }, SECRET, { expiresIn: "365d" }); // 1 año
}
export function signRefresh(sub) {
    return jwt.sign({ sub, type: "refresh" }, SECRET, { expiresIn: "365d" }); // 1 año
}
export function signReset(prcId, email, minutes) {
    return jwt.sign({ type: "password_reset", prcId, email }, SECRET, { expiresIn: `${minutes}m` });
}
export function verifyReset(token) {
    try {
        return jwt.verify(token, SECRET);
    }
    catch {
        return null;
    }
}
