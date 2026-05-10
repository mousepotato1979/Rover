import { Router, type IRouter } from "express";
import { db, sportsTable } from "@workspace/db";
import { ListSportsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sports", async (req, res): Promise<void> => {
  const sports = await db.select().from(sportsTable).orderBy(sportsTable.id);
  res.json(ListSportsResponse.parse(sports));
});

export default router;
