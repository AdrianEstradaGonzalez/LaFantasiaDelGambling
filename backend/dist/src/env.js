export const env = {
    PORT: Number(process.env.PORT || 3000),
    JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    APP_URL: process.env.APP_URL || "http://localhost:3000"
};
