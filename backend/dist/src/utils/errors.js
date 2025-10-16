export class AppError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(400, 'VALIDATION_ERROR', message);
    }
}
export class AuthError extends AppError {
    constructor(message) {
        super(401, 'AUTH_ERROR', message);
    }
}
export class NotFoundError extends AppError {
    constructor(resource) {
        super(404, 'NOT_FOUND', `${resource} no encontrado`);
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(409, 'CONFLICT', message);
    }
}
