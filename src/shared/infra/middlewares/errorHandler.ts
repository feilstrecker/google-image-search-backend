import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('err', err);

  if (err instanceof AppError) {
    const error = {
      message: err.message,
      field: err.status,
    };
    return res.status(err.status).json(error);
  }

  if (err) {
    console.log('Erro interno =>', err?.message ?? JSON.stringify(err));
  }

  return res.status(500).json([
    {
      message: 'Erro interno no servidor!',
      field: 500,
    },
  ]);
};
