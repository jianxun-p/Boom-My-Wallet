export class AppError extends Error {
  statusCode: number;

  constructor(message?: string, statusCode?: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode ?? 500;

    Error.captureStackTrace(this, this.constructor); // limits stack trace to exclude this constructor
  }
}

export class MissingArgError extends AppError {
  constructor(paramName: string) {
    super(`Missing value for the parameter ${paramName}.`, 400);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor); // limits stack trace to exclude this constructor
  }
}

export class UnAuthError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid Credentials.', 401);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor); // limits stack trace to exclude this constructor
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Not Found.', 404);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor); // limits stack trace to exclude this constructor
  }
}
