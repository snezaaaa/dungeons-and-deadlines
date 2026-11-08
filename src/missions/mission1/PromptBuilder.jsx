import React from 'react';
import PromptBuilderBase from '../../ui/PromptBuilderBase.jsx';
import { SLOTS, CARDS, isCardAvailable, assemblePrompt } from './promptPuzzle.js';
import { testPrompt, startDoorSequence } from './logic.js';

export default function PromptBuilder() {
  return (
    <PromptBuilderBase
      title="PROMPT BUILDER" tag="// PROMPTOTRON 3000"
      subtitle="Pick one card for each part. Glowing cards were found in the room. The others came with the software. (Suspicious.)"
      slots={SLOTS} cards={CARDS}
      isAvailable={isCardAvailable}
      lockedText={(slot) => `Not found yet — search the room for the ${slot.label} component`}
      assemble={assemblePrompt}
      onTest={testPrompt} onSuccess={startDoorSequence}
      thinkingLabel="PROMPTOTRON IS THINKING…" successFoot="Unlocking door…"
    />
  );
}
