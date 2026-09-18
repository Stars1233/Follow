import { asc, inArray } from "drizzle-orm"

import { db } from "../db"
import { syncTransactionsTable } from "../schemas"
import type { SyncTransactionSchema } from "../schemas/types"
import type { Resetable } from "./internal/base"

class SyncTransactionServiceStatic implements Resetable {
  async reset() {
    await db.delete(syncTransactionsTable).execute()
  }

  getAll() {
    return db.query.syncTransactionsTable.findMany({
      orderBy: asc(syncTransactionsTable.createdAt),
    })
  }

  async insert(transaction: SyncTransactionSchema) {
    await db.insert(syncTransactionsTable).values(transaction).onConflictDoNothing()
  }

  async deleteMany(ids: string[]) {
    if (ids.length === 0) return
    await db.delete(syncTransactionsTable).where(inArray(syncTransactionsTable.id, ids))
  }
}

export const SyncTransactionService = new SyncTransactionServiceStatic()
