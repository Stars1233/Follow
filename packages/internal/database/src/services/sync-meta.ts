import { eq } from "drizzle-orm"

import { db } from "../db"
import { syncMetaTable } from "../schemas"
import type { Resetable } from "./internal/base"

class SyncMetaServiceStatic implements Resetable {
  async reset() {
    await db.delete(syncMetaTable).execute()
  }

  async get(key: string): Promise<string | null> {
    const row = await db.query.syncMetaTable.findFirst({ where: eq(syncMetaTable.key, key) })
    return row?.value ?? null
  }

  async set(key: string, value: string) {
    await db
      .insert(syncMetaTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: [syncMetaTable.key], set: { value } })
  }

  async delete(key: string) {
    await db.delete(syncMetaTable).where(eq(syncMetaTable.key, key))
  }
}

export const SyncMetaService = new SyncMetaServiceStatic()
