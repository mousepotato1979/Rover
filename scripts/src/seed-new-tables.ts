import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../lib/db/src/schema/index.js";
import { subHours, subDays } from "date-fns";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding line_moves and bankroll_history...");

  const existing = await db.select().from(schema.lineMovesTable).limit(1);
  if (existing.length > 0) {
    console.log("line_moves already seeded, skipping.");
  } else {
    const now = new Date();
    const lineMoveRows: schema.InsertLineMove[] = [];

    const gameMovements: Array<{
      gameId: number;
      snapshots: Array<{ hoursAgo: number; homeML: number; awayML: number; spread: number; ou: number }>;
    }> = [
      {
        gameId: 1, // Bills @ Chiefs
        snapshots: [
          { hoursAgo: 72, homeML: -175, awayML: 148, spread: -3.5, ou: 51.0 },
          { hoursAgo: 48, homeML: -170, awayML: 148, spread: -3.0, ou: 51.0 },
          { hoursAgo: 36, homeML: -168, awayML: 150, spread: -3.0, ou: 51.5 },
          { hoursAgo: 24, homeML: -165, awayML: 148, spread: -3.0, ou: 51.5 },
          { hoursAgo: 12, homeML: -165, awayML: 152, spread: -3.0, ou: 51.5 },
          { hoursAgo: 2,  homeML: -165, awayML: 145, spread: -3.0, ou: 51.5 },
        ],
      },
      {
        gameId: 2, // Lions @ 49ers
        snapshots: [
          { hoursAgo: 72, homeML: -200, awayML: 168, spread: -4.5, ou: 47.5 },
          { hoursAgo: 48, homeML: -195, awayML: 165, spread: -4.5, ou: 48.0 },
          { hoursAgo: 36, homeML: -195, awayML: 168, spread: -4.5, ou: 48.0 },
          { hoursAgo: 24, homeML: -192, awayML: 165, spread: -4.5, ou: 48.0 },
          { hoursAgo: 12, homeML: -190, awayML: 165, spread: -4.5, ou: 48.0 },
          { hoursAgo: 2,  homeML: -190, awayML: 165, spread: -4.5, ou: 48.0 },
        ],
      },
      {
        gameId: 3, // Lakers @ Celtics
        snapshots: [
          { hoursAgo: 72, homeML: -165, awayML: 138, spread: -4.0, ou: 218.5 },
          { hoursAgo: 48, homeML: -162, awayML: 135, spread: -4.0, ou: 218.5 },
          { hoursAgo: 36, homeML: -160, awayML: 135, spread: -3.5, ou: 219.0 },
          { hoursAgo: 24, homeML: -155, awayML: 132, spread: -3.5, ou: 219.0 },
          { hoursAgo: 12, homeML: -155, awayML: 130, spread: -3.5, ou: 219.5 },
          { hoursAgo: 2,  homeML: -152, awayML: 128, spread: -3.5, ou: 219.5 },
        ],
      },
      {
        gameId: 4, // Heat @ Bucks
        snapshots: [
          { hoursAgo: 72, homeML: -145, awayML: 122, spread: -3.0, ou: 215.0 },
          { hoursAgo: 48, homeML: -148, awayML: 125, spread: -3.0, ou: 215.0 },
          { hoursAgo: 24, homeML: -150, awayML: 128, spread: -3.0, ou: 215.5 },
          { hoursAgo: 2,  homeML: -150, awayML: 128, spread: -3.0, ou: 215.5 },
        ],
      },
      {
        gameId: 5, // Braves @ Cubs
        snapshots: [
          { hoursAgo: 72, homeML: 110, awayML: -125, spread: -1.5, ou: 8.0 },
          { hoursAgo: 48, homeML: 112, awayML: -128, spread: -1.5, ou: 8.0 },
          { hoursAgo: 24, homeML: 115, awayML: -130, spread: -1.5, ou: 8.5 },
          { hoursAgo: 2,  homeML: 118, awayML: -135, spread: -1.5, ou: 8.5 },
        ],
      },
      {
        gameId: 6, // Yankees @ Red Sox
        snapshots: [
          { hoursAgo: 72, homeML: 125, awayML: -142, spread: -1.5, ou: 9.0 },
          { hoursAgo: 48, homeML: 122, awayML: -140, spread: -1.5, ou: 9.0 },
          { hoursAgo: 24, homeML: 120, awayML: -138, spread: -1.5, ou: 9.5 },
          { hoursAgo: 2,  homeML: 118, awayML: -135, spread: -1.5, ou: 9.5 },
        ],
      },
      {
        gameId: 7, // Lightning @ Panthers (NHL)
        snapshots: [
          { hoursAgo: 48, homeML: 115, awayML: -132, spread: -1.5, ou: 6.0 },
          { hoursAgo: 24, homeML: 118, awayML: -135, spread: -1.5, ou: 6.0 },
          { hoursAgo: 2,  homeML: 120, awayML: -140, spread: -1.5, ou: 6.5 },
        ],
      },
      {
        gameId: 8, // Man City @ Arsenal
        snapshots: [
          { hoursAgo: 48, homeML: -115, awayML: 310, spread: -0.5, ou: 2.5 },
          { hoursAgo: 24, homeML: -118, awayML: 315, spread: -0.5, ou: 2.5 },
          { hoursAgo: 2,  homeML: -120, awayML: 320, spread: -0.5, ou: 2.5 },
        ],
      },
    ];

    for (const gm of gameMovements) {
      for (const snap of gm.snapshots) {
        lineMoveRows.push({
          gameId: gm.gameId,
          bookName: "Consensus",
          homeMoneyline: snap.homeML,
          awayMoneyline: snap.awayML,
          homeSpread: String(snap.spread),
          overUnder: String(snap.ou),
          recordedAt: subHours(now, snap.hoursAgo),
        });
      }
    }

    await db.insert(schema.lineMovesTable).values(lineMoveRows);
    console.log(`Seeded ${lineMoveRows.length} line move snapshots.`);
  }

  const existingHistory = await db.select().from(schema.bankrollHistoryTable).limit(1);
  if (existingHistory.length > 0) {
    console.log("bankroll_history already seeded, skipping.");
  } else {
    const now = new Date();
    const historyRows: schema.InsertBankrollHistory[] = [
      { amount: "1000.00", pnl: "0.00",   note: "Starting bankroll",       recordedAt: subDays(now, 30) },
      { amount: "1000.00", pnl: "0.00",   note: "Eagles ML — Pending",     recordedAt: subDays(now, 28) },
      { amount: "990.00",  pnl: "-10.00", note: "Cowboys ML — Loss 1u",    recordedAt: subDays(now, 27) },
      { amount: "1010.00", pnl: "20.00",  note: "Lakers +4.5 — Win 2u",    recordedAt: subDays(now, 25) },
      { amount: "1025.00", pnl: "15.00",  note: "Red Sox ML — Win 1.5u",   recordedAt: subDays(now, 23) },
      { amount: "1015.00", pnl: "-10.00", note: "Leafs ML — Loss 1u",      recordedAt: subDays(now, 21) },
      { amount: "1040.00", pnl: "25.00",  note: "Chiefs -3 — Win 2.5u",    recordedAt: subDays(now, 19) },
      { amount: "1030.00", pnl: "-10.00", note: "Packers +2.5 — Loss 1u",  recordedAt: subDays(now, 17) },
      { amount: "1055.00", pnl: "25.00",  note: "Heat ML — Win 2.5u",      recordedAt: subDays(now, 15) },
      { amount: "1070.00", pnl: "15.00",  note: "Cubs U8.5 — Win 1.5u",    recordedAt: subDays(now, 13) },
      { amount: "1060.00", pnl: "-10.00", note: "Knicks ML — Loss 1u",     recordedAt: subDays(now, 11) },
      { amount: "1085.00", pnl: "25.00",  note: "49ers -4.5 — Win 2.5u",   recordedAt: subDays(now, 9)  },
      { amount: "1095.00", pnl: "10.00",  note: "Arsenal +0.5 — Win 1u",   recordedAt: subDays(now, 7)  },
      { amount: "1115.00", pnl: "20.00",  note: "Celtics -3.5 — Win 2u",   recordedAt: subDays(now, 5)  },
      { amount: "1105.00", pnl: "-10.00", note: "Padres ML — Loss 1u",     recordedAt: subDays(now, 4)  },
      { amount: "1125.00", pnl: "20.00",  note: "Eagles ML — Win 2u",      recordedAt: subDays(now, 3)  },
      { amount: "1145.00", pnl: "20.00",  note: "Lakers ML — Win 2u",      recordedAt: subDays(now, 2)  },
      { amount: "1165.00", pnl: "20.00",  note: "Cubs ML — Win 2u",        recordedAt: subDays(now, 1)  },
      { amount: "1165.00", pnl: "0.00",   note: "Chiefs ML — Pending",     recordedAt: now              },
    ];

    await db.insert(schema.bankrollHistoryTable).values(historyRows);
    console.log(`Seeded ${historyRows.length} bankroll history entries.`);
  }

  await pool.end();
  console.log("Done.");
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
