import { createPool, type Pool } from "mysql2/promise";
import { getMySqlPoolConfig } from "./config";

let cachedPool: Pool | null | undefined;

export function getMySqlPool() {
  if (cachedPool !== undefined) {
    return cachedPool;
  }

  const poolConfig = getMySqlPoolConfig();
  cachedPool = poolConfig ? createPool(poolConfig) : null;
  return cachedPool;
}
