/**
 * PokerPlayer — an Agent subclass with poker personality.
 */
import { Agent } from '../../index.js';

export default class PokerPlayer extends Agent {
  constructor(name, style, opts) {
    const system = [
      `You are ${name}, a poker player.`,
      `Your style: ${style}`,
      ``,
      `When asked to act, respond with EXACTLY one of:`,
      `  FOLD`,
      `  CHECK`,
      `  CALL`,
      `  RAISE [amount]`,
      ``,
      `After your action, you may add one line of table talk (trash talk, bluffing, banter).`,
      `Keep table talk short — one sentence max.`,
      ``,
      `Example responses:`,
      `  CALL`,
      `  I've seen better hands in a kids' game.`,
      ``,
      `  RAISE 50`,
      `  Let's see who's serious here.`,
      ``,
      `  FOLD`,
      `  Not worth my time.`,
    ].join('\n');

    super(name, system, opts);
    this.playerName = name;
    this.chips = opts.startingChips || 1000;
    this.hand = [];
    this.folded = false;
    this.currentBet = 0;
  }

  resetForHand(hand1, hand2) {
    this.hand = [hand1, hand2];
    this.folded = false;
    this.currentBet = 0;
  }
}

/**
 * Parse an LLM response into a structured poker action.
 */
export function parseAction(text, player, currentBet, minRaise) {
  const lines = text.split('\n').filter(Boolean);
  const actionLine = (lines[0] || '').toUpperCase();
  const talk = lines.slice(1).join(' ').trim();

  if (actionLine.startsWith('FOLD')) {
    return { action: 'fold', amount: 0, talk };
  }
  if (actionLine.startsWith('CHECK')) {
    if (currentBet > player.currentBet) {
      return { action: 'fold', amount: 0, talk: talk || '(tried to check, had to fold)' };
    }
    return { action: 'check', amount: 0, talk };
  }
  if (actionLine.startsWith('CALL')) {
    const toCall = Math.min(currentBet - player.currentBet, player.chips);
    return { action: 'call', amount: toCall, talk };
  }
  if (actionLine.startsWith('RAISE')) {
    const match = actionLine.match(/RAISE\s+(\d+)/);
    let raiseAmt = match ? parseInt(match[1]) : minRaise;
    raiseAmt = Math.max(raiseAmt, minRaise);
    raiseAmt = Math.min(raiseAmt, player.chips);
    return { action: 'raise', amount: raiseAmt, talk };
  }

  // Default: call or check
  if (currentBet > player.currentBet) {
    const toCall = Math.min(currentBet - player.currentBet, player.chips);
    return { action: 'call', amount: toCall, talk: talk || '(unclear action, calling)' };
  }
  return { action: 'check', amount: 0, talk: talk || '(unclear action, checking)' };
}
