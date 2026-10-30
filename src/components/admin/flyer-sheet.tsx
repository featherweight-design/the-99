import { fanContentNotice } from "../../lib/copy/fan-content-notice";
import { flyerCopy } from "../../lib/copy/join";
import { flyerTypedParts } from "../../lib/flyer/print-rule";

/**
 * The flyer, letter size, one ink (flyer trial PR 4c; `Print.dc.html` `.fly`, `Flyer.dc.html`). Drawn at 816 x 1056 CSS px
 * (8.5 x 11 in at 96 dpi); the page scales it to fit on a screen and prints it at 1:1. The QR is drawn on the server from
 * the path `uqr` made. The sheet itself sets no background in print, so the paper is the stock the store bought; the
 * cards keep their drawn gold fill when the browser prints background graphics.
 */
export function FlyerSheet({ url, qr }: { url: string; qr: { size: number; d: string } }) {
  const typed = flyerTypedParts(url);
  return (
    <div className="flyer-sheet" data-testid="flyer-sheet">
      <div className="fs-in">
        <div className="fs-wm" aria-label="The 99">
          <span className="fs-the">THE</span>
          <span className="fs-mk">
            <span className="fs-cr"><i /><i /><i /></span>
            <span className="fs-nn">99</span>
          </span>
        </div>
        <div className="fs-kk">{flyerCopy.kicker}</div>
        <h2 className="fs-h1">{flyerCopy.pitch}</h2>
        <p className="fs-sub">{flyerCopy.sub}</p>
        <div className="fs-mid">
          <div className="fs-fan">
            <div className="fs-c fs-l" />
            <div className="fs-c fs-r" />
            <div className="fs-c fs-f">
              <span className="fs-ql">{flyerCopy.scan.toUpperCase()}</span>
              <svg width="212" height="212" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${typed.prefix}${typed.code}`}>
                <path fill="currentColor" d={qr.d} />
              </svg>
              <span className="fs-dm"><i /><i /><i /></span>
            </div>
          </div>
        </div>
        <div className="fs-url">
          <small>{flyerCopy.orType}</small>
          <b>{typed.prefix}<em>{typed.code}</em></b>
        </div>
        <div className="fs-ft">{flyerCopy.facts(new URL(url).host).map((f) => <span key={f}>{f}</span>)}</div>
        <p className="fs-fcn">{fanContentNotice.passageOne}</p>
      </div>
    </div>
  );
}
