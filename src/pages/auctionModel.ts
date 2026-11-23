export type AuctionStatus = 'draft' | 'active' | 'ended';
export type Role = 'seller' | 'buyer';
export type Bid = { id: string; amount: number; by: 'you' | 'other'; at: number };
export type Terms = { startPrice: number; step: number; duration: number };
export type Auction = {
  status: AuctionStatus;
  terms: Terms;
  endsAt: number | null;
  bids: Bid[];
};

export const defaultTerms: Terms = { startPrice: 12_000_000, step: 100_000, duration: 24 };
export const createDraft = (): Auction => ({
  status: 'draft',
  terms: { ...defaultTerms },
  endsAt: null,
  bids: [],
});
export const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
export const parseMoney = (value: string) => {
  const digits = value.replace(/[\s\u00a0\u202f]/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : NaN;
};
export const highestBid = (auction: Auction) => auction.bids[0];
export const minimumBid = (auction: Auction) =>
  highestBid(auction) ? highestBid(auction).amount + auction.terms.step : auction.terms.startPrice;
export const isEnded = (auction: Auction, now = Date.now()) =>
  auction.status === 'ended' ||
  (auction.status === 'active' && now >= (auction.endsAt ?? Infinity));

export function bidError(auction: Auction, amount: number, now = Date.now()): string | null {
  if (isEnded(auction, now)) return 'Аукцион завершён. Новые ставки больше не принимаются.';
  if (auction.status !== 'active') return 'Аукцион ещё не опубликован.';
  if (!Number.isSafeInteger(amount) || amount <= 0) return 'Введите сумму в рублях целым числом.';
  if (amount < minimumBid(auction))
    return `Минимальная ставка сейчас — ${money(minimumBid(auction))}.`;
  return null;
}

export type AuctionAction =
  | { type: 'publish'; terms: Terms; now: number }
  | { type: 'bid'; amount: number; by: Bid['by']; now: number; id: string }
  | { type: 'end' }
  | { type: 'reset' }
  | { type: 'example'; now: number };

export function auctionReducer(state: Auction, action: AuctionAction): Auction {
  switch (action.type) {
    case 'publish':
      return {
        status: 'active',
        terms: { ...action.terms },
        endsAt: action.now + action.terms.duration * 3_600_000,
        bids: [],
      };
    case 'bid':
      if (
        bidError(state, action.amount, action.now) ||
        state.bids.some((bid) => bid.id === action.id)
      )
        return state;
      return {
        ...state,
        bids: [
          { id: action.id, amount: action.amount, by: action.by, at: action.now },
          ...state.bids,
        ],
      };
    case 'end':
      return state.status === 'active' ? { ...state, status: 'ended' } : state;
    case 'reset':
      return createDraft();
    case 'example':
      return {
        status: 'active',
        terms: { ...defaultTerms },
        endsAt: action.now + 18 * 3_600_000 + 42 * 60_000,
        bids: [
          { id: 'example-3', amount: 12_300_000, by: 'other', at: action.now - 5 * 60_000 },
          { id: 'example-2', amount: 12_200_000, by: 'other', at: action.now - 24 * 60_000 },
          { id: 'example-1', amount: 12_000_000, by: 'other', at: action.now - 40 * 60_000 },
        ],
      };
  }
}
