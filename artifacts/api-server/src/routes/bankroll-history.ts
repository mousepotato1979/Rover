import { Router, type IRouter } from "express";
import { db, bankrollHistoryTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { GetBankrollHistoryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bankroll/history", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(bankrollHistoryTable)
    .orderBy(asc(bankrollHistoryTable.recordedAt));

  res.json(
    GetBankrollHistoryResponse.parse(
      rows.map(r => ({
        id: r.id,
        date: r.recordedAt.toISOString(),
        amount: Number(r.amount),
        pnl: Number(r.pnl),
        note: r.note,
      }))
    )
  );
});

export default router;
