class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode ?? 500;
        
        Error.captureStackTrace(this, this.constructor);    // limits stack trace to exclude this constructor
    }
}

class UnAuthError extends AppError {
    constructor(message) {
        super(message ?? "Invalid Credentials.", 401);
        this.name = this.constructor.name;
        
        Error.captureStackTrace(this, this.constructor);    // limits stack trace to exclude this constructor
    }
}


module.exports = {
    AppError,
    UnAuthError,
};
