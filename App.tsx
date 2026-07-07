import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  type Card,
  type CapturedCards,
  type CaptureOption,
  type PlayerId,
  type RoundScore,
  type ScopaCount,
  chooseBotMove,
  createInitialDeal,
  dealNextHands,
  findCaptureOptions,
  formatCard,
  removeCards,
  scoreRound
} from "./src/game/scopa";
import { CARD_BACK_IMAGE, CARD_IMAGES } from "./src/assets/cardImages";

const MATCH_TARGET = 11;
const SUIT_BADGES: Record<Card["suit"], string> = {
  denari: "D",
  coppe: "C",
  spade: "S",
  bastoni: "B"
};

type GameStatus = "playing" | "roundOver" | "matchOver";
type ModalName = "rules" | "privacy" | "score" | null;

interface PendingCapture {
  card: Card;
  options: CaptureOption[];
}

interface GameState {
  deck: Card[];
  humanHand: Card[];
  botHand: Card[];
  table: Card[];
  captured: CapturedCards;
  scopas: ScopaCount;
  totals: Record<PlayerId, number>;
  turn: PlayerId;
  status: GameStatus;
  roundIndex: number;
  message: string;
  lastCapture: PlayerId | null;
  roundScore: RoundScore | null;
  pendingCapture: PendingCapture | null;
}

function createRound(
  totals: Record<PlayerId, number> = { human: 0, bot: 0 },
  roundIndex = 1
): GameState {
  const deal = createInitialDeal();

  return {
    deck: deal.deck,
    humanHand: deal.humanHand,
    botHand: deal.botHand,
    table: deal.table,
    captured: { human: [], bot: [] },
    scopas: { human: 0, bot: 0 },
    totals,
    turn: "human",
    status: "playing",
    roundIndex,
    message: "A toi de jouer. Capture une carte ou pose une carte sur la table.",
    lastCapture: null,
    roundScore: null,
    pendingCapture: null
  };
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createRound());
  const [activeModal, setActiveModal] = useState<ModalName>(null);

  useEffect(() => {
    if (game.status !== "playing" || game.turn !== "bot" || game.pendingCapture) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setGame((current) => {
        if (current.status !== "playing" || current.turn !== "bot") {
          return current;
        }

        const finalMove =
          current.deck.length === 0 &&
          current.humanHand.length === 0 &&
          current.botHand.length === 1;
        const move = chooseBotMove(current.botHand, current.table, finalMove);
        return playMove(current, "bot", move.card, move.option);
      });
    }, 620);

    return () => clearTimeout(timer);
  }, [game.botHand.length, game.pendingCapture, game.status, game.table.length, game.turn]);

  const roundLeader = useMemo(() => {
    if (game.totals.human === game.totals.bot) {
      return "Egalite";
    }

    return game.totals.human > game.totals.bot ? "Tu menes" : "Le bot mene";
  }, [game.totals.bot, game.totals.human]);
  const turnHint = buildTurnHint(game);

  function handleHumanCardPress(card: Card) {
    if (game.status !== "playing" || game.turn !== "human" || game.pendingCapture) {
      return;
    }

    const options = findCaptureOptions(card, game.table);

    if (options.length > 1) {
      setGame((current) => ({
        ...current,
        pendingCapture: {
          card,
          options
        },
        message: "Choisis le pli que tu veux capturer."
      }));
      return;
    }

    const [onlyOption] = options;
    setGame((current) => playMove(current, "human", card, onlyOption));
  }

  function handleCaptureChoice(option: CaptureOption) {
    setGame((current) => {
      if (!current.pendingCapture) {
        return current;
      }

      return playMove(current, "human", current.pendingCapture.card, option);
    });
  }

  function startNextRound() {
    setActiveModal(null);
    setGame((current) => createRound(current.totals, current.roundIndex + 1));
  }

  function resetMatch() {
    setActiveModal(null);
    setGame(createRound());
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Partie a {MATCH_TARGET}</Text>
            <Text style={styles.title}>La Scopa</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>{roundLeader}</Text>
            <Text style={styles.scoreValue}>
              {game.totals.human} - {game.totals.bot}
            </Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <ToolbarButton label="Regles" onPress={() => setActiveModal("rules")} />
          <ToolbarButton label="Score" onPress={() => setActiveModal("score")} />
          <ToolbarButton label="Confidentialite" onPress={() => setActiveModal("privacy")} />
          <ToolbarButton label="Reset" onPress={resetMatch} danger />
        </View>

        <View style={styles.opponentZone}>
          <View>
            <Text style={styles.zoneLabel}>Bot local</Text>
            <Text style={styles.zoneDetail}>
              {game.captured.bot.length} cartes capturees · {game.scopas.bot} scopa
            </Text>
          </View>
          <DeckBacks count={game.botHand.length} />
        </View>

        <View style={styles.tableZone}>
          <View style={styles.tableHeader}>
            <View>
              <Text style={styles.zoneLabel}>Table</Text>
              <Text style={styles.zoneDetail}>
                {game.table.length} carte{game.table.length > 1 ? "s" : ""} visible
              </Text>
            </View>
            <View style={styles.deckCounter}>
              <Text style={styles.deckCounterValue}>{game.deck.length}</Text>
              <Text style={styles.deckCounterLabel}>pioche</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.tableCards}>
            {game.table.length === 0 ? (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyTableText}>Table vide</Text>
              </View>
            ) : (
              game.table.map((card) => <GameCard key={card.id} card={card} compact />)
            )}
          </ScrollView>
        </View>

        <View style={styles.messageBar}>
          <Text style={styles.messageText}>{game.message}</Text>
          {turnHint ? <Text style={styles.messageHint}>{turnHint}</Text> : null}
        </View>

        {game.pendingCapture ? (
          <CaptureChoicePanel
            pending={game.pendingCapture}
            onCancel={() =>
              setGame((current) => ({
                ...current,
                pendingCapture: null,
                message: "Choix annule. A toi de jouer."
              }))
            }
            onChoose={handleCaptureChoice}
          />
        ) : null}

        <View style={styles.handZone}>
          <View>
            <Text style={styles.zoneLabel}>Ta main</Text>
            <Text style={styles.zoneDetail}>
              {game.captured.human.length} cartes capturees · {game.scopas.human} scopa
            </Text>
          </View>
          <View style={styles.handCards}>
            {game.humanHand.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                disabled={game.turn !== "human" || game.status !== "playing"}
                onPress={() => handleHumanCardPress(card)}
              />
            ))}
          </View>
        </View>

        {game.status !== "playing" ? (
          <View style={styles.endPanel}>
            <Text style={styles.endTitle}>
              {game.status === "matchOver" ? "Match termine" : "Manche terminee"}
            </Text>
            <Text style={styles.endCopy}>{buildEndCopy(game)}</Text>
            <View style={styles.endActions}>
              {game.status === "roundOver" ? (
                <PrimaryButton label="Nouvelle manche" onPress={startNextRound} />
              ) : null}
              <SecondaryButton label="Nouvelle partie" onPress={resetMatch} />
            </View>
          </View>
        ) : null}

        <InfoModal
          visible={activeModal === "rules"}
          title="Comment jouer"
          onClose={() => setActiveModal(null)}
        >
          <RulesGuide />
        </InfoModal>

        <InfoModal
          visible={activeModal === "privacy"}
          title="Confidentialite"
          onClose={() => setActiveModal(null)}
        >
          <InfoText>
            Cette V1 ne cree pas de compte, ne collecte rien, n'envoie aucune donnee et n'utilise ni
            publicite, ni analytics, ni achat integre.
          </InfoText>
          <InfoText>
            Le multijoueur demandera plus tard une politique de donnees separee, car il faudra synchroniser
            les parties entre appareils.
          </InfoText>
        </InfoModal>

        <InfoModal
          visible={activeModal === "score"}
          title="Score"
          onClose={() => setActiveModal(null)}
        >
          <ScoreBreakdown score={game.roundScore} totals={game.totals} />
        </InfoModal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function playMove(
  state: GameState,
  player: PlayerId,
  card: Card,
  option?: CaptureOption
): GameState {
  if (state.status !== "playing" || state.turn !== player) {
    return state;
  }

  const nextHumanHand = player === "human" ? removeCards(state.humanHand, [card]) : state.humanHand;
  const nextBotHand = player === "bot" ? removeCards(state.botHand, [card]) : state.botHand;
  const finalMove =
    state.deck.length === 0 && nextHumanHand.length === 0 && nextBotHand.length === 0;
  const nextCaptured: CapturedCards = {
    human: [...state.captured.human],
    bot: [...state.captured.bot]
  };
  const nextScopas: ScopaCount = { ...state.scopas };
  let nextTable = state.table;
  let nextMessage = "";
  let nextLastCapture = state.lastCapture;

  if (option) {
    const capturedCards = [card, ...option.cards];
    nextCaptured[player] = [...nextCaptured[player], ...capturedCards];
    nextTable = removeCards(state.table, option.cards);
    nextLastCapture = player;

    const madeScopa = nextTable.length === 0 && !finalMove;

    if (madeScopa) {
      nextScopas[player] += 1;
    }

    nextMessage =
      player === "human"
        ? `Tu captures ${formatCapture(option)}${madeScopa ? " et tu fais scopa." : "."}`
        : `Le bot capture ${formatCapture(option)}${madeScopa ? " et fait scopa." : "."}`;
  } else {
    nextTable = [...state.table, card];
    nextMessage =
      player === "human"
        ? `Tu poses ${formatCard(card)} sur la table.`
        : `Le bot pose ${formatCard(card)}.`;
  }

  return resolveRoundProgress({
    ...state,
    humanHand: nextHumanHand,
    botHand: nextBotHand,
    table: nextTable,
    captured: nextCaptured,
    scopas: nextScopas,
    turn: nextPlayer(player),
    message: nextMessage,
    lastCapture: nextLastCapture,
    pendingCapture: null
  });
}

function resolveRoundProgress(state: GameState): GameState {
  if (state.humanHand.length > 0 || state.botHand.length > 0) {
    return state;
  }

  if (state.deck.length > 0) {
    const nextDeal = dealNextHands(state.deck);

    return {
      ...state,
      deck: nextDeal.deck,
      humanHand: nextDeal.humanHand,
      botHand: nextDeal.botHand,
      message: `${state.message} Nouvelle distribution.`
    };
  }

  let finalCaptured = state.captured;

  if (state.table.length > 0 && state.lastCapture) {
    finalCaptured = {
      ...state.captured,
      [state.lastCapture]: [...state.captured[state.lastCapture], ...state.table]
    };
  }

  const roundScore = scoreRound(finalCaptured, state.scopas);
  const totals = {
    human: state.totals.human + roundScore.totals.human,
    bot: state.totals.bot + roundScore.totals.bot
  };
  const hasMatchWinner =
    (totals.human >= MATCH_TARGET || totals.bot >= MATCH_TARGET) && totals.human !== totals.bot;

  return {
    ...state,
    table: [],
    captured: finalCaptured,
    roundScore,
    totals,
    status: hasMatchWinner ? "matchOver" : "roundOver",
    message: hasMatchWinner
      ? "Le match est termine."
      : "La manche est terminee. Consulte le score puis relance une manche."
  };
}

function nextPlayer(player: PlayerId): PlayerId {
  return player === "human" ? "bot" : "human";
}

function formatCapture(option: CaptureOption): string {
  return option.cards.map(formatCard).join(" + ");
}

function buildTurnHint(game: GameState): string {
  if (game.status !== "playing") {
    return "";
  }

  if (game.pendingCapture) {
    return "Plusieurs prises sont possibles : choisis le groupe de cartes a ramasser.";
  }

  if (game.turn === "bot") {
    return "Le bot reflechit, puis ce sera a toi.";
  }

  const captureMoves = game.humanHand.flatMap((card) =>
    findCaptureOptions(card, game.table).map((option) => ({
      card,
      option
    }))
  );

  if (captureMoves.length === 0) {
    return "Aucune capture disponible : touche une carte de ta main pour la poser sur la table.";
  }

  const bestMove = captureMoves
    .sort(
      (left, right) =>
        Number(right.option.cards.length === game.table.length) -
          Number(left.option.cards.length === game.table.length) ||
        right.option.cards.length - left.option.cards.length
    )[0];

  if (!bestMove) {
    return "";
  }

  const scopaHint = bestMove.option.cards.length === game.table.length ? " Cela viderait la table." : "";
  return `Capture possible : joue ${formatCard(bestMove.card)} pour prendre ${formatCapture(bestMove.option)}.${scopaHint}`;
}

function buildEndCopy(game: GameState): string {
  if (!game.roundScore) {
    return "Score en cours de calcul.";
  }

  const round = game.roundScore.totals;
  const winner =
    game.totals.human === game.totals.bot ? "egalite" : game.totals.human > game.totals.bot ? "toi" : "bot";

  if (game.status === "matchOver") {
    return `Manche ${round.human}-${round.bot}. Score total ${game.totals.human}-${game.totals.bot}, victoire ${winner}.`;
  }

  return `Manche ${round.human}-${round.bot}. Total ${game.totals.human}-${game.totals.bot}.`;
}

function ToolbarButton({
  label,
  onPress,
  danger = false
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarButton,
        danger ? styles.toolbarButtonDanger : null,
        pressed ? styles.pressed : null
      ]}
    >
      <Text style={[styles.toolbarButtonText, danger ? styles.toolbarButtonDangerText : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DeckBacks({ count }: { count: number }) {
  return (
    <View style={styles.deckBacks}>
      {Array.from({ length: Math.max(count, 1) }).map((_, index) => (
        <View
          key={`back-${index}`}
          style={[
            styles.cardBackMini,
            {
              marginLeft: index === 0 ? 0 : -30,
              opacity: count === 0 ? 0.35 : 1
            }
          ]}
        >
          <Image source={CARD_BACK_IMAGE} style={styles.cardBackMiniImage} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}

function GameCard({
  card,
  compact = false,
  disabled = false,
  onPress
}: {
  card: Card;
  compact?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const cardImage = CARD_IMAGES[card.id];

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={card.label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        disabled ? styles.cardDisabled : null,
        pressed ? styles.cardPressed : null
      ]}
    >
      {cardImage ? (
        <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.cardImageFallback}>
          <Text style={styles.cardImageFallbackText}>{formatCard(card)}</Text>
        </View>
      )}
      <View style={[styles.cardIndexBadge, compact ? styles.cardIndexBadgeCompact : null]}>
        <Text style={[styles.cardIndexText, compact ? styles.cardIndexTextCompact : null]}>
          {card.shortLabel}{SUIT_BADGES[card.suit]}
        </Text>
      </View>
    </Pressable>
  );
}

function CaptureChoicePanel({
  pending,
  onChoose,
  onCancel
}: {
  pending: PendingCapture;
  onChoose: (option: CaptureOption) => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.capturePanel}>
      <View style={styles.captureHeader}>
        <Text style={styles.captureTitle}>Jouer {formatCard(pending.card)}</Text>
        <Pressable accessibilityRole="button" onPress={onCancel}>
          <Text style={styles.captureCancel}>Annuler</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.captureOptions}>
        {pending.options.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => onChoose(option)}
            style={({ pressed }) => [styles.captureOption, pressed ? styles.pressed : null]}
          >
            <Text style={styles.captureOptionKind}>
              {option.kind === "match" ? "Meme valeur" : "Somme"}
            </Text>
            <Text style={styles.captureOptionText}>{formatCapture(option)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function RulesGuide() {
  return (
    <View style={styles.rulesGuide}>
      <RuleSection title="But">
        <RuleText>
          Tu joues contre le bot. Le match se joue a 11 points. A chaque manche, le but est de
          capturer les bonnes cartes : beaucoup de cartes, beaucoup de denari, le 7 de denari et
          les meilleures cartes pour la primiera.
        </RuleText>
      </RuleSection>

      <RuleSection title="Ton tour">
        <RuleStep index="1" text="Regarde les cartes sur la table." />
        <RuleStep index="2" text="Choisis une carte de ta main." />
        <RuleStep index="3" text="Si elle peut capturer, l'app ramasse les cartes pour toi." />
        <RuleStep index="4" text="Si elle ne peut rien capturer, elle est posee sur la table." />
      </RuleSection>

      <RuleSection title="Capturer">
        <RuleText>
          Une carte capture d'abord une carte de meme valeur. C'est prioritaire.
        </RuleText>
        <RuleExample title="Meme valeur" text="Tu joues un 5. S'il y a un 5 sur la table, tu prends ce 5." />
        <RuleText>
          S'il n'y a pas de meme valeur, ta carte peut capturer plusieurs cartes dont la somme
          vaut sa valeur.
        </RuleText>
        <RuleExample title="Somme" text="Tu joues un 7. Tu peux prendre 1 + 6, ou 2 + 5, ou 3 + 4." />
      </RuleSection>

      <RuleSection title="Scopa">
        <RuleText>
          Si ta capture vide toute la table, tu fais scopa et tu marques 1 point. Exception : la
          toute derniere capture de la manche ne donne pas de point scopa.
        </RuleText>
      </RuleSection>

      <RuleSection title="Fin de manche">
        <RuleText>On ajoute les points suivants :</RuleText>
        <RuleStep index="+" text="1 point pour celui qui a capture le plus de cartes." />
        <RuleStep index="+" text="1 point pour celui qui a le plus de denari." />
        <RuleStep index="+" text="1 point pour le 7 de denari, le settebello." />
        <RuleStep index="+" text="1 point pour la meilleure primiera." />
        <RuleStep index="+" text="1 point par scopa faite pendant la manche." />
      </RuleSection>

      <RuleSection title="Primiera">
        <RuleText>
          La primiera compare la meilleure carte de chaque couleur. Les 7 sont les plus forts,
          puis 6, As, 5, 4, 3, 2, puis les figures. En cas d'egalite sur cartes, denari ou
          primiera, personne ne prend le point.
        </RuleText>
      </RuleSection>

      <View style={styles.ruleTip}>
        <Text style={styles.ruleTipTitle}>Astuce simple</Text>
        <Text style={styles.ruleTipText}>
          Priorite au 7 de denari, aux denari, et aux coups qui font scopa. Si tu es perdu,
          regarde l'aide sous le message de jeu.
        </Text>
      </View>
    </View>
  );
}

function RuleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.ruleSection}>
      <Text style={styles.ruleSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RuleText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.ruleText}>{children}</Text>;
}

function RuleStep({ index, text }: { index: string; text: string }) {
  return (
    <View style={styles.ruleStep}>
      <View style={styles.ruleStepBadge}>
        <Text style={styles.ruleStepBadgeText}>{index}</Text>
      </View>
      <Text style={styles.ruleStepText}>{text}</Text>
    </View>
  );
}

function RuleExample({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.ruleExample}>
      <Text style={styles.ruleExampleTitle}>{title}</Text>
      <Text style={styles.ruleExampleText}>{text}</Text>
    </View>
  );
}

function InfoModal({
  visible,
  title,
  children,
  onClose
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.infoText}>{children}</Text>;
}

function ScoreBreakdown({
  score,
  totals
}: {
  score: RoundScore | null;
  totals: Record<PlayerId, number>;
}) {
  if (!score) {
    return (
      <View>
        <InfoText>Total actuel : toi {totals.human}, bot {totals.bot}.</InfoText>
        <InfoText>Le detail de manche apparaitra apres la premiere manche terminee.</InfoText>
      </View>
    );
  }

  return (
    <View style={styles.scoreRows}>
      <ScoreRow
        label="Cartes"
        value={`${score.cardCounts.human} / ${score.cardCounts.bot}`}
        winner={score.cardsWinner}
      />
      <ScoreRow
        label="Denari"
        value={`${score.denariCounts.human} / ${score.denariCounts.bot}`}
        winner={score.denariWinner}
      />
      <ScoreRow label="Settebello" value="7 de denari" winner={score.settebelloWinner} />
      <ScoreRow
        label="Primiera"
        value={`${score.primieraValues.human} / ${score.primieraValues.bot}`}
        winner={score.primieraWinner}
      />
      <ScoreRow
        label="Scopa"
        value={`${score.scopaPoints.human} / ${score.scopaPoints.bot}`}
        winner={null}
      />
      <View style={styles.scoreTotalRow}>
        <Text style={styles.scoreTotalText}>Manche : toi {score.totals.human}, bot {score.totals.bot}</Text>
        <Text style={styles.scoreTotalText}>Total : toi {totals.human}, bot {totals.bot}</Text>
      </View>
    </View>
  );
}

function ScoreRow({
  label,
  value,
  winner
}: {
  label: string;
  value: string;
  winner: PlayerId | null;
}) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreRowLabel}>{label}</Text>
      <Text style={styles.scoreRowValue}>{value}</Text>
      <Text style={styles.scoreRowWinner}>{winner ? playerLabel(winner) : "egalite"}</Text>
    </View>
  );
}

function playerLabel(player: PlayerId): string {
  return player === "human" ? "toi" : "bot";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#13271F",
    paddingHorizontal: 16
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 10
  },
  kicker: {
    color: "#E0C67D",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#FFF8EA",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0
  },
  scorePill: {
    alignItems: "flex-end",
    backgroundColor: "#FFF8EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  scoreLabel: {
    color: "#5B4D2F",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  scoreValue: {
    color: "#13271F",
    fontSize: 20,
    fontWeight: "900"
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12
  },
  toolbarButton: {
    backgroundColor: "rgba(255, 248, 234, 0.12)",
    borderColor: "rgba(255, 248, 234, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  toolbarButtonDanger: {
    backgroundColor: "rgba(179, 49, 60, 0.18)",
    borderColor: "rgba(240, 150, 143, 0.4)"
  },
  toolbarButtonText: {
    color: "#FFF8EA",
    fontSize: 12,
    fontWeight: "800"
  },
  toolbarButtonDangerText: {
    color: "#FFD6D2"
  },
  opponentZone: {
    alignItems: "center",
    backgroundColor: "rgba(255, 248, 234, 0.08)",
    borderColor: "rgba(255, 248, 234, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },
  zoneLabel: {
    color: "#FFF8EA",
    fontSize: 16,
    fontWeight: "900"
  },
  zoneDetail: {
    color: "#BFD1C4",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2
  },
  deckBacks: {
    alignItems: "center",
    flexDirection: "row",
    minWidth: 100
  },
  cardBackMini: {
    alignItems: "center",
    backgroundColor: "#5F1724",
    borderColor: "rgba(255, 248, 234, 0.35)",
    borderRadius: 6,
    borderWidth: 1,
    height: 70,
    justifyContent: "center",
    overflow: "hidden",
    width: 44
  },
  cardBackMiniImage: {
    height: "100%",
    width: "100%"
  },
  tableZone: {
    flex: 1,
    marginTop: 12,
    minHeight: 220
  },
  tableHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  deckCounter: {
    alignItems: "center",
    backgroundColor: "#244A3B",
    borderRadius: 8,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  deckCounterValue: {
    color: "#FFF8EA",
    fontSize: 20,
    fontWeight: "900"
  },
  deckCounterLabel: {
    color: "#BFD1C4",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  tableCards: {
    alignContent: "center",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    paddingBottom: 10
  },
  emptyTable: {
    alignItems: "center",
    alignSelf: "stretch",
    borderColor: "rgba(255, 248, 234, 0.14)",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 160,
    width: "100%"
  },
  emptyTableText: {
    color: "#BFD1C4",
    fontSize: 14,
    fontWeight: "800"
  },
  messageBar: {
    backgroundColor: "#FFF8EA",
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  messageText: {
    color: "#18251F",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  messageHint: {
    borderTopColor: "rgba(24, 37, 31, 0.12)",
    borderTopWidth: 1,
    color: "#5B4D2F",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 8,
    paddingTop: 8
  },
  handZone: {
    backgroundColor: "#1B382D",
    borderColor: "rgba(255, 248, 234, 0.13)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    paddingBottom: 16
  },
  handCards: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 12
  },
  card: {
    backgroundColor: "#2A2119",
    borderRadius: 8,
    height: 150,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    width: 90
  },
  cardCompact: {
    height: 112,
    width: 68
  },
  cardPressed: {
    transform: [{ translateY: -4 }]
  },
  cardDisabled: {
    opacity: 0.55
  },
  cardImage: {
    height: "100%",
    width: "100%"
  },
  cardImageFallback: {
    alignItems: "center",
    backgroundColor: "#FFF8EA",
    flex: 1,
    justifyContent: "center"
  },
  cardImageFallbackText: {
    color: "#18251F",
    fontSize: 18,
    fontWeight: "900"
  },
  cardIndexBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 248, 234, 0.92)",
    borderColor: "rgba(42, 34, 25, 0.32)",
    borderRadius: 5,
    borderWidth: 1,
    left: 6,
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: "absolute",
    top: 6
  },
  cardIndexBadgeCompact: {
    borderRadius: 4,
    left: 4,
    minWidth: 22,
    paddingHorizontal: 3,
    paddingVertical: 1,
    top: 4
  },
  cardIndexText: {
    color: "#2A2119",
    fontSize: 12,
    fontWeight: "900"
  },
  cardIndexTextCompact: {
    fontSize: 10
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardRank: {
    fontSize: 20,
    fontWeight: "900"
  },
  cardRankCompact: {
    fontSize: 16
  },
  cardSuitSmall: {
    fontSize: 16,
    fontWeight: "900"
  },
  cardArt: {
    alignItems: "center",
    height: 58,
    justifyContent: "center"
  },
  cardArtCompact: {
    height: 42
  },
  pipGrid: {
    alignContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "center"
  },
  pip: {
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
    width: 18
  },
  pipCompact: {
    fontSize: 17,
    lineHeight: 19,
    width: 14
  },
  faceBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 48,
    paddingHorizontal: 8
  },
  faceSymbol: {
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 26
  },
  faceText: {
    fontSize: 14,
    fontWeight: "900"
  },
  cardSuitName: {
    color: "#5B4D2F",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  cardSuitNameCompact: {
    fontSize: 9
  },
  capturePanel: {
    backgroundColor: "#FFF8EA",
    borderRadius: 8,
    marginBottom: 10,
    padding: 12
  },
  captureHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  captureTitle: {
    color: "#18251F",
    fontSize: 15,
    fontWeight: "900"
  },
  captureCancel: {
    color: "#8E2B3D",
    fontSize: 13,
    fontWeight: "900"
  },
  captureOptions: {
    gap: 8
  },
  captureOption: {
    backgroundColor: "#F4E9D4",
    borderColor: "#D9B463",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 118,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  captureOptionKind: {
    color: "#80622B",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  captureOptionText: {
    color: "#18251F",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2
  },
  endPanel: {
    backgroundColor: "#FFF8EA",
    borderRadius: 8,
    bottom: 20,
    left: 16,
    padding: 16,
    position: "absolute",
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18
  },
  endTitle: {
    color: "#18251F",
    fontSize: 22,
    fontWeight: "900"
  },
  endCopy: {
    color: "#526157",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6
  },
  endActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  primaryButton: {
    backgroundColor: "#B78116",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  primaryButtonText: {
    color: "#FFF8EA",
    fontSize: 14,
    fontWeight: "900"
  },
  secondaryButton: {
    backgroundColor: "#E6D5B7",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  secondaryButtonText: {
    color: "#18251F",
    fontSize: 14,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.72
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(7, 16, 12, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  modalPanel: {
    backgroundColor: "#FFF8EA",
    borderRadius: 8,
    maxHeight: "86%",
    maxWidth: 520,
    padding: 16,
    width: "100%"
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  modalTitle: {
    color: "#18251F",
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    paddingRight: 12
  },
  modalClose: {
    backgroundColor: "#E6D5B7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  modalCloseText: {
    color: "#18251F",
    fontSize: 12,
    fontWeight: "900"
  },
  modalContent: {
    paddingBottom: 4
  },
  infoText: {
    color: "#526157",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 10
  },
  rulesGuide: {
    gap: 10
  },
  ruleSection: {
    backgroundColor: "#F4E9D4",
    borderColor: "rgba(128, 98, 43, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  ruleSectionTitle: {
    color: "#18251F",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8
  },
  ruleText: {
    color: "#526157",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 8
  },
  ruleStep: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
    marginBottom: 7
  },
  ruleStepBadge: {
    alignItems: "center",
    backgroundColor: "#18251F",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 24,
    minWidth: 24,
    paddingHorizontal: 5
  },
  ruleStepBadgeText: {
    color: "#FFF8EA",
    fontSize: 12,
    fontWeight: "900"
  },
  ruleStepText: {
    color: "#526157",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  ruleExample: {
    backgroundColor: "#FFF8EA",
    borderLeftColor: "#B78116",
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  ruleExampleTitle: {
    color: "#80622B",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 2,
    textTransform: "uppercase"
  },
  ruleExampleText: {
    color: "#18251F",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  ruleTip: {
    backgroundColor: "#18251F",
    borderRadius: 8,
    padding: 12
  },
  ruleTipTitle: {
    color: "#E0C67D",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4
  },
  ruleTipText: {
    color: "#FFF8EA",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  scoreRows: {
    gap: 8
  },
  scoreRow: {
    alignItems: "center",
    backgroundColor: "#F4E9D4",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  scoreRowLabel: {
    color: "#18251F",
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  scoreRowValue: {
    color: "#80622B",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  scoreRowWinner: {
    color: "#275D8C",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  scoreTotalRow: {
    backgroundColor: "#18251F",
    borderRadius: 8,
    gap: 3,
    padding: 12
  },
  scoreTotalText: {
    color: "#FFF8EA",
    fontSize: 14,
    fontWeight: "900"
  }
});
