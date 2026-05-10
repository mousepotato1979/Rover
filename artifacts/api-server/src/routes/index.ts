import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sportsRouter from "./sports";
import gamesRouter from "./games";
import predictionsRouter from "./predictions";
import picksRouter from "./picks";
import statsRouter from "./stats";
import oddsRouter from "./odds";
import bookOddsRouter from "./book-odds";
import bankrollRouter from "./bankroll";
import lineMovesRouter from "./line-moves";
import bankrollHistoryRouter from "./bankroll-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sportsRouter);
router.use(gamesRouter);
router.use(predictionsRouter);
router.use(picksRouter);
router.use(statsRouter);
router.use(oddsRouter);
router.use(bookOddsRouter);
router.use(bankrollRouter);
router.use(lineMovesRouter);
router.use(bankrollHistoryRouter);

export default router;
