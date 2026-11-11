/**
 * The words of a Secret Lair drop's sale-time push (drop alerts, handoff call 3): the title leads with the hour, in the
 * DEVICE's zone and unlabelled. A device with no known zone (none, or the default `UTC`) reads the store's zone, labelled,
 * and a time on another day than the push takes its weekday. A push that lands after the sale began says "On sale now". Pure: the item holds instants, the device and clock come in.
 */
import { pushCopy } from "../copy/push";
import { clockWords, dayKey, weekdayWords, zoneLabel } from "../time/clock";
import type { PushItem } from "./message";

/** The device's zone (null: unknown) and the clock the push is read against (null: no weekday is named). */
export type SaleDevice = { zone: string | null; now: Date | null };
export const NO_DEVICE: SaleDevice = { zone: null, now: null };

/** `at 11 a.m.`, `Tue at 12 a.m.` or, in the store's zone, `at 8 a.m. PT`. */
function phrase(instant: Date, store: string, device: SaleDevice): string {
  const view = device.zone ?? store;
  const day = device.now && dayKey(instant, view) !== dayKey(device.now, view) ? `${weekdayWords(instant, view)} ` : "";
  return `${day}at ${clockWords(instant, view)}${device.zone ? "" : ` ${zoneLabel(store)}`}`;
}

export function saleWords(item: Extract<PushItem, { sale: true }>, device: SaleDevice): { title: string; body: string } {
  const c = pushCopy.one.sale;
  // A late tick: the sale has begun, so no hour is named ahead.
  if (device.now && device.now.getTime() >= item.onSaleAt.getTime()) return { title: c.liveTitle, body: c.saleBody(item.title) };
  // A late tick past the pre-queue's opening: it is open already, so lead with the sale.
  if (device.now && item.preQueueAt && device.now.getTime() >= item.preQueueAt.getTime()) return { title: c.saleTitle(phrase(item.onSaleAt, item.zone, device)), body: c.saleBody(item.title) };
  const sale = phrase(item.onSaleAt, item.zone, device);
  if (!item.preQueueAt) return { title: c.saleTitle(sale), body: c.saleBody(item.title) };
  return { title: c.queueTitle(phrase(item.preQueueAt, item.zone, device)), body: c.queueBody(item.title, sale) };
}
