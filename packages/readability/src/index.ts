import { Readability } from "@mozilla/readability"
import chardet from "chardet"
import { parseHTML } from "linkedom/worker"

import { sanitizeHTMLString } from "./sanitize"

const isDev = process.env.NODE_ENV === "development"

const userAgents =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

/**
 * Decodes the response body of a `fetch` request into a string, ensuring proper character set handling.
 * @throws Will return "Failed to decode response content." if the decoding process encounters any errors.
 */
async function decodeResponseBodyChars(res: Response) {
  // Read the response body as an ArrayBuffer
  const buffer = await res.arrayBuffer()
  // Step 1: Get charset from Content-Type header
  const contentType = res.headers.get("content-type")
  const httpCharset = contentType?.match(/charset=([\w-]+)/i)?.[1]
  // Step 2: Use charset from Content-Type header or fall back to chardet
  const detectedCharset = httpCharset || chardet.detect(Buffer.from(buffer)) || "utf-8"
  // Step 3: Decode the response body using the detected charset
  try {
    const decodedText = new TextDecoder(detectedCharset, { fatal: false }).decode(buffer)
    return decodedText
  } catch {
    return "Failed to decode response content."
  }
}

export interface ReadabilityOptions {
  /**
   * How to fetch the page. Electron's main process passes `net.fetch` so the request follows
   * the app's proxy settings; by default the runtime's own `fetch` is used.
   */
  fetch?: (input: string, init?: RequestInit) => Promise<Response>
}

export async function readability(baseUrl: string, options?: ReadabilityOptions) {
  const fetchPage = options?.fetch ?? fetch
  const dirtyDocumentString = await fetchPage(baseUrl, {
    headers: {
      "User-Agent": userAgents,
      Accept: "text/html",
    },
  }).then(decodeResponseBodyChars)

  const sanitizedDocumentString = sanitizeHTMLString(dirtyDocumentString)
  const baseOrigin = new URL(baseUrl).origin

  // FIXME: linkedom does not handle relative addresses in strings. Refer to
  // @see https://github.com/WebReflection/linkedom/issues/153
  // JSDOM handles it correctly, but JSDOM introduces canvas binding.
  const { document } = parseHTML(sanitizedDocumentString)

  document.querySelectorAll("a").forEach((a) => {
    a.href = replaceRelativeAddress(baseOrigin, a.href)
  })
  ;(["img", "audio", "video"] as const).forEach((tag) => {
    document.querySelectorAll(tag).forEach((img) => {
      img.src = img.src && replaceRelativeAddress(baseOrigin, img.src)
    })
  })

  const reader = new Readability(document, {
    debug: isDev,
    // keep classes to set the right code language
    // https://github.com/RSSNext/Follow/issues/1058
    keepClasses: true,
  })
  return reader.parse()
}

const replaceRelativeAddress = (baseUrl: string, url: string) => {
  if (url.startsWith("http")) {
    return url
  }
  return new URL(url, baseUrl).href
}
