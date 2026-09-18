import type { WithdrawRequest } from "@follow-app/client-sdk"

import { followClient } from "./api-client"

/**
 * The wallet and RSS3 features are frozen: their screens stay as they are and current
 * servers no longer accept these writes. The client SDK dropped them from its types in
 * 0.3.96, so the legacy request shapes live here. Runtime behaviour is unchanged: the same
 * paths are requested with the same payloads as before the SDK upgrade.
 */

/** Fields the withdraw form still submits although the SDK no longer declares them. */
export type LegacyWithdrawRequest = WithdrawRequest & {
  toRss3?: boolean
  TOTPCode?: string
}

/** Server configuration flags that older servers reported. */
export type LegacyServerConfigs = {
  IS_RSS3_TESTNET?: boolean
}

/** `POST /wallets`, formerly `followClient.api.wallets.post()`. */
export const createLegacyWallet = () =>
  followClient.request<unknown>("/wallets", { method: "POST" })
