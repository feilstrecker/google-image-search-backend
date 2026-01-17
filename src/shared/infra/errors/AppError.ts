export class AppError {
  public readonly message: string;
  public readonly status: number;

  constructor(status: number, message: string) {
    this.message = message;
    this.status = status;
  }
}
