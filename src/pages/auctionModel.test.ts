import { describe, expect, it } from 'vitest';
import {
  auctionReducer,
  bidError,
  createDraft,
  defaultTerms,
  isEnded,
  minimumBid,
} from './auctionModel';

const now = 1_800_000_000_000;
const published = () =>
  auctionReducer(createDraft(), { type: 'publish', terms: defaultTerms, now });

describe('auction rules', () => {
  it('publishes the agreed terms and accepts the starting price as the first bid', () => {
    const auction = published();
    expect(auction.endsAt).toBe(now + 24 * 3_600_000);
    expect(minimumBid(auction)).toBe(12_000_000);
    expect(bidError(auction, 12_000_000, now)).toBeNull();
  });
  it('rejects a low, fractional or invalid bid and recalculates the next minimum', () => {
    let auction = published();
    expect(bidError(auction, 11_999_999, now)).toContain('Минимальная ставка');
    expect(bidError(auction, NaN, now)).toContain('целым числом');
    expect(bidError(auction, 12_000_000.5, now)).toContain('целым числом');
    auction = auctionReducer(auction, {
      type: 'bid',
      amount: 12_000_000,
      by: 'you',
      now,
      id: 'first',
    });
    expect(minimumBid(auction)).toBe(12_100_000);
    expect(bidError(auction, 12_000_000, now)).toContain('Минимальная ставка');
  });
  it('rejects a bid made stale by another participant and prevents duplicate requests', () => {
    const auction = auctionReducer(published(), {
      type: 'bid',
      amount: 12_100_000,
      by: 'other',
      now,
      id: 'other',
    });
    const stale = auctionReducer(auction, {
      type: 'bid',
      amount: 12_100_000,
      by: 'you',
      now,
      id: 'you',
    });
    expect(stale).toBe(auction);
    const duplicate = auctionReducer(auction, {
      type: 'bid',
      amount: 12_200_000,
      by: 'other',
      now,
      id: 'other',
    });
    expect(duplicate).toBe(auction);
  });
  it('closes at the exact deadline and keeps the last accepted bid', () => {
    const auction = auctionReducer(published(), {
      type: 'bid',
      amount: 12_000_000,
      by: 'you',
      now,
      id: 'first',
    });
    const deadline = auction.endsAt!;
    expect(isEnded(auction, deadline - 1)).toBe(false);
    expect(isEnded(auction, deadline)).toBe(true);
    expect(bidError(auction, 12_100_000, deadline)).toContain('завершён');
    expect(
      auctionReducer(auction, {
        type: 'bid',
        amount: 12_100_000,
        by: 'other',
        now: deadline,
        id: 'late',
      }),
    ).toBe(auction);
    const ended = auctionReducer(auction, { type: 'end' });
    expect(ended.bids[0].by).toBe('you');
    expect(bidError(ended, 12_100_000, now)).toContain('завершён');
  });
});
