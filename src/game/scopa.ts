export type Suit = "denari" | "coppe" | "spade" | "bastoni";
export type PlayerId = "human" | "bot";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  label: string;
  shortLabel: string;
  primeValue: number;
}

export interface CaptureOption {
  id: string;
  cards: Card[];
  kind: "match" | "sum";
}

export interface InitialDeal {
  deck: Card[];
  humanHand: Card[];
  botHand: Card[];
  table: Card[];
}

export interface CapturedCards {
  human: Card[];
  bot: Card[];
}

export interface ScopaCount {
  human: number;
  bot: number;
}

export interface RoundScore {
  cardsWinner: PlayerId | null;
  denariWinner: PlayerId | null;
  settebelloWinner: PlayerId | null;
  primieraWinner: PlayerId | null;
  primieraValues: Record<PlayerId, number>;
  denariCounts: Record<PlayerId, number>;
  cardCounts: Record<PlayerId, number>;
  scopaPoints: ScopaCount;
  totals: Record<PlayerId, number>;
}

export interface BotMove {
  card: Card;
  option?: CaptureOption;
}

export const SUITS: Suit[] = ["denari", "coppe", "spade", "bastoni"];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const SUIT_META: Record<
  Suit,
  {
    label: string;
    shortLabel: string;
    symbol: string;
    color: string;
    softColor: string;
  }
> = {
  denari: {
    label: "Denari",
    shortLabel: "D",
    symbol: "●",
    color: "#B78116",
    softColor: "#F7D572"
  },
  coppe: {
    label: "Coppe",
    shortLabel: "C",
    symbol: "∪",
    color: "#9B2743",
    softColor: "#F2A1AF"
  },
  spade: {
    label: "Spade",
    shortLabel: "S",
    symbol: "†",
    color: "#275D8C",
    softColor: "#9EC9E4"
  },
  bastoni: {
    label: "Bastoni",
    shortLabel: "B",
    symbol: "▮",
    color: "#42703B",
    softColor: "#A8D37E"
  }
};

const PRIME_VALUES: Record<Rank, number> = {
  1: 16,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 18,
  7: 21,
  8: 10,
  9: 10,
  10: 10
};

const RANK_LABELS: Record<Rank, string> = {
  1: "Asso",
  2: "Due",
  3: "Tre",
  4: "Quattro",
  5: "Cinque",
  6: "Sei",
  7: "Sette",
  8: "Fante",
  9: "Cavallo",
  10: "Re"
};

const RANK_SHORT_LABELS: Record<Rank, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "F",
  9: "C",
  10: "R"
};

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
      value: rank,
      label: `${RANK_LABELS[rank]} di ${SUIT_META[suit].label}`,
      shortLabel: RANK_SHORT_LABELS[rank],
      primeValue: PRIME_VALUES[rank]
    }))
  );
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];

    if (current && swap) {
      shuffled[index] = swap;
      shuffled[swapIndex] = current;
    }
  }

  return shuffled;
}

export function createInitialDeal(): InitialDeal {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const deck = shuffleDeck(createDeck());
    const humanHand = deck.slice(0, 3);
    const botHand = deck.slice(3, 6);
    const table = deck.slice(6, 10);
    const rest = deck.slice(10);
    const kingCount = table.filter((card) => card.rank === 10).length;

    if (kingCount < 3) {
      return {
        deck: rest,
        humanHand,
        botHand,
        table
      };
    }
  }

  const deck = shuffleDeck(createDeck());

  return {
    humanHand: deck.slice(0, 3),
    botHand: deck.slice(3, 6),
    table: deck.slice(6, 10),
    deck: deck.slice(10)
  };
}

export function dealNextHands(deck: Card[]): Pick<InitialDeal, "deck" | "humanHand" | "botHand"> {
  return {
    humanHand: deck.slice(0, 3),
    botHand: deck.slice(3, 6),
    deck: deck.slice(6)
  };
}

export function findCaptureOptions(played: Card, table: Card[]): CaptureOption[] {
  const directMatches = table.filter((card) => card.value === played.value);

  if (directMatches.length > 0) {
    return directMatches.map((card) => ({
      id: card.id,
      kind: "match",
      cards: [card]
    }));
  }

  const combinations: Card[][] = [];

  function search(startIndex: number, total: number, picked: Card[]) {
    if (total === played.value && picked.length > 1) {
      combinations.push(picked);
      return;
    }

    if (total >= played.value) {
      return;
    }

    for (let index = startIndex; index < table.length; index += 1) {
      const next = table[index];

      if (next) {
        search(index + 1, total + next.value, [...picked, next]);
      }
    }
  }

  search(0, 0, []);

  return combinations
    .map((cards) => ({
      id: cards
        .map((card) => card.id)
        .sort()
        .join("+"),
      kind: "sum" as const,
      cards
    }))
    .sort((left, right) => right.cards.length - left.cards.length || left.id.localeCompare(right.id));
}

export function removeCards(cards: Card[], removed: Card[]): Card[] {
  const removedIds = new Set(removed.map((card) => card.id));
  return cards.filter((card) => !removedIds.has(card.id));
}

export function isSettebello(card: Card): boolean {
  return card.suit === "denari" && card.rank === 7;
}

export function scoreRound(captured: CapturedCards, scopas: ScopaCount): RoundScore {
  const cardCounts = {
    human: captured.human.length,
    bot: captured.bot.length
  };
  const denariCounts = {
    human: countSuit(captured.human, "denari"),
    bot: countSuit(captured.bot, "denari")
  };
  const primieraValues = {
    human: calculatePrimiera(captured.human),
    bot: calculatePrimiera(captured.bot)
  };
  const cardsWinner = compareHigher(cardCounts.human, cardCounts.bot);
  const denariWinner = compareHigher(denariCounts.human, denariCounts.bot);
  const primieraWinner = compareHigher(primieraValues.human, primieraValues.bot);
  const humanHasSettebello = captured.human.some(isSettebello);
  const botHasSettebello = captured.bot.some(isSettebello);
  const settebelloWinner: PlayerId | null = humanHasSettebello ? "human" : botHasSettebello ? "bot" : null;

  const totals: Record<PlayerId, number> = {
    human: scopas.human,
    bot: scopas.bot
  };

  for (const winner of [cardsWinner, denariWinner, primieraWinner, settebelloWinner]) {
    if (winner) {
      totals[winner] += 1;
    }
  }

  return {
    cardsWinner,
    denariWinner,
    settebelloWinner,
    primieraWinner,
    primieraValues,
    denariCounts,
    cardCounts,
    scopaPoints: scopas,
    totals
  };
}

export function chooseBotMove(hand: Card[], table: Card[], finalMove: boolean): BotMove {
  const captureMoves = hand.flatMap((card) =>
    findCaptureOptions(card, table).map((option) => ({
      card,
      option,
      score: scoreBotCapture(card, option, table, finalMove)
    }))
  );

  if (captureMoves.length > 0) {
    const [bestMove] = captureMoves.sort((left, right) => right.score - left.score);

    if (bestMove) {
      return {
        card: bestMove.card,
        option: bestMove.option
      };
    }
  }

  const [discard] = [...hand].sort((left, right) => scoreBotDiscard(left) - scoreBotDiscard(right));

  return {
    card: discard ?? hand[0]!
  };
}

export function formatCard(card: Card): string {
  return `${card.shortLabel}${SUIT_META[card.suit].shortLabel}`;
}

function scoreBotCapture(card: Card, option: CaptureOption, table: Card[], finalMove: boolean): number {
  const capturedCards = [card, ...option.cards];
  const clearsTable = option.cards.length === table.length;
  let score = option.cards.length * 3 + capturedCards.length;

  if (clearsTable && !finalMove) {
    score += 18;
  }

  if (capturedCards.some(isSettebello)) {
    score += 24;
  }

  score += capturedCards.filter((capturedCard) => capturedCard.suit === "denari").length * 5;
  score += capturedCards.filter((capturedCard) => capturedCard.rank === 7).length * 4;
  score += capturedCards.reduce((total, capturedCard) => total + capturedCard.primeValue / 8, 0);

  return score;
}

function scoreBotDiscard(card: Card): number {
  let risk = card.value;

  if (card.suit === "denari") {
    risk += 12;
  }

  if (card.rank === 7) {
    risk += 10;
  }

  if (card.rank === 6 || card.rank === 1) {
    risk += 3;
  }

  return risk;
}

function countSuit(cards: Card[], suit: Suit): number {
  return cards.filter((card) => card.suit === suit).length;
}

function calculatePrimiera(cards: Card[]): number {
  return SUITS.reduce((total, suit) => {
    const best = cards
      .filter((card) => card.suit === suit)
      .sort((left, right) => right.primeValue - left.primeValue)[0];

    return total + (best?.primeValue ?? 0);
  }, 0);
}

function compareHigher(humanValue: number, botValue: number): PlayerId | null {
  if (humanValue === botValue) {
    return null;
  }

  return humanValue > botValue ? "human" : "bot";
}
