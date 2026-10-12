/** @jest-environment node */
import { isAllowedDocumentUrl } from "../documents"

describe("isAllowedDocumentUrl", () => {
  it("accepte https", () => {
    expect(isAllowedDocumentUrl("https://example.com/bail.pdf", false)).toBe(true)
    expect(isAllowedDocumentUrl("  https://drive.google.com/file/d/x  ", false)).toBe(true)
  })

  it("refuse javascript:, data:, file: et les chaînes invalides", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(document.cookie)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "file:///etc/passwd",
      "ftp://example.com/x.pdf",
      "vbscript:msgbox(1)",
      "pas une url",
      "",
    ]) {
      expect(isAllowedDocumentUrl(url, true)).toBe(false)
    }
  })

  it("n'accepte http qu'en développement", () => {
    expect(isAllowedDocumentUrl("http://localhost:3000/x.pdf", false)).toBe(false)
    expect(isAllowedDocumentUrl("http://localhost:3000/x.pdf", true)).toBe(true)
  })
})
