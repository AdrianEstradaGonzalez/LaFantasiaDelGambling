export const env = {
    PORT: Number(process.env.PORT || 3000),
    JWT_SECRET: process.env.JWT_SECRET || "dev_secret"
};
