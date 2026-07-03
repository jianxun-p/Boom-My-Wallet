import { Router, type RequestHandler } from 'express';
import { router as GoogleSheetsRouter } from '@/controllers/transactions/googleSheets.js';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '@/services/transactions.js';
import type { User } from '@/types/user.d.ts';
import type {
  EmptyBody,
  EmptyQuery,
  ErrorResponse,
  ListTransactionsResponse,
  MessageResponse,
  TransactionIdParams,
  TransactionRequestBody,
  UserParams,
} from '@/types/controller.d.ts';

type UserLocals = {
  user: User;
};

export const router = Router({ mergeParams: true });

const listTransactionsHandler: RequestHandler<
  UserParams,
  ListTransactionsResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery,
  UserLocals
> = async (_req, res, next) => {
  try {
    res.status(200).json({ data: await listTransactions(res.locals.user) });
  } catch (e) {
    next(e);
  }
};

const createTransactionHandler: RequestHandler<
  UserParams,
  MessageResponse | ErrorResponse,
  TransactionRequestBody,
  EmptyQuery,
  UserLocals
> = async (req, res, next) => {
  try {
    await createTransaction(res.locals.user, req.body.transaction);
    res.status(200).json({ data: {}, message: 'Successfully added transaction' });
  } catch (e) {
    next(e);
  }
};

const deleteTransactionHandler: RequestHandler<
  TransactionIdParams,
  MessageResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery,
  UserLocals
> = async (req, res, next) => {
  try {
    await deleteTransaction(res.locals.user, req.params.tid);
    res.status(200).json({ data: {}, message: 'Successfully deleted transaction' });
  } catch (e) {
    next(e);
  }
};

const updateTransactionHandler: RequestHandler<
  TransactionIdParams,
  MessageResponse | ErrorResponse,
  TransactionRequestBody,
  EmptyQuery,
  UserLocals
> = async (req, res, next) => {
  try {
    await updateTransaction(res.locals.user, req.params.tid, req.body.transaction);
    res.status(200).json({ data: {}, message: 'Successfully updated transaction' });
  } catch (e) {
    next(e);
  }
};

router.use('/services/googleSheets', GoogleSheetsRouter);
router.get('/', listTransactionsHandler);
router.post('/', createTransactionHandler);
router.delete('/:tid', deleteTransactionHandler);
router.put('/:tid', updateTransactionHandler);
