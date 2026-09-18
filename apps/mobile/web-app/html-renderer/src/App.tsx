import { createStore, Provider, useAtomValue } from "jotai"
import { useMemo } from "react"

import {
  entryAtom,
  noMediaAtom,
  readerRenderInlineStyleAtom,
  readerStyleAtom,
  spotlightAtom,
} from "./atoms"
import { HTML } from "./HTML"
import { WebViewBridgeManager } from "./managers/webview-bridge"
import { getReaderArticleStyle, READER_TEXT_COLOR_CLASS } from "./reader-style"

const store = createStore()

// Initialize and expose WebView bridge functions
const bridgeManager = new WebViewBridgeManager(store)
bridgeManager.exposeToWindow()

export const App = () => {
  const entry = useAtomValue(entryAtom, { store })
  const readerRenderInlineStyle = useAtomValue(readerRenderInlineStyleAtom, { store })
  const noMedia = useAtomValue(noMediaAtom, { store })
  const spotlightRules = useAtomValue(spotlightAtom, { store })
  const readerStyle = useAtomValue(readerStyleAtom, { store })
  const coverMedia = entry?.media?.[0]
  const articleStyle = useMemo(() => getReaderArticleStyle(readerStyle), [readerStyle])

  return (
    <Provider store={store}>
      <HTML
        renderInlineStyle={readerRenderInlineStyle}
        noMedia={noMedia}
        spotlightRules={spotlightRules}
        coverImageUrl={coverMedia?.type === "photo" ? coverMedia.url : undefined}
        baseUrl={entry?.url ?? undefined}
        style={articleStyle}
        className={readerStyle?.textColor ? READER_TEXT_COLOR_CLASS : undefined}
      >
        {entry?.content}
      </HTML>
    </Provider>
  )
}
