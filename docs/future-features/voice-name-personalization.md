# Voice Name Personalization

> **Status:** Exploration only. No implementation or engine selection committed.
> Captured September 2026 for future investigation.

## Problem and Goal

Ultimate players often use unusual nicknames such as `Lang` or `C4`. The offline recognizer may
produce an unrelated word or no transcript even when the tracker operator speaks clearly.
Jersey-number commands work well, but require the operator to remember the association between
players and numbers during live play. This is particularly awkward in pickup or practice contexts.

The goal is to let operators use familiar player names reliably while retaining numbers and touch
as fallbacks. Usually only seven players are active, making the candidate set small. That helps
resolve ambiguity, but cannot recover audio information that a text-only parser never receives.

See [current voice-input behavior](../features/advanced-tracking/voice-input.md).

## Current Implementation

- Tap-to-speak, offline recognition, currently configured for `en-US`.
- `expo-speech-recognition` wraps the platform recognizer.
- Active player names, name parts, and jersey-number phrases are supplied as `contextualStrings`.
- Up to five transcript alternatives are requested and considered by the matching pipeline.
- Matching is scoped to the active lineup. Approximate name matching uses spelling edit distance,
  not an explicit pronunciation model.
- Names wait for final recognition; qualifying number results can record from interim results.
- Successful commands use the existing pass-capture path; the holder supplies the thrower.

Relevant sources:

- `hooks/advancedTracking/useVoiceStatCommands.ts`
- `lib/advancedTracking/voiceCommandParser.ts`
- `lib/advancedTracking/voiceContext.ts`
- `lib/advancedTracking/voicePhraseUtils.ts`
- `lib/advancedTracking/voiceNumberUtils.ts`
- `lib/advancedTracking/voiceCaptureIntentUtils.ts`

Vocabulary hints are not a restricted grammar or a pronunciation dictionary. There are two distinct
failure modes: incorrect text that can potentially be mapped to a player, and no usable text,
which requires improving recognition or matching the audio directly.

## Option 1: Spoken Aliases and Confirmed Transcript Mappings

Keep display names unchanged and store accepted spoken forms separately. For `C4`, possible
forms include `see four`, `sea four`, and `C four`. Include aliases in both recognition hints and
parser candidates.

An optional player-setup interaction could let an operator test a name and explicitly associate a
consistent mistranscription with that player: for example, saying `Lang` repeatedly produces
`Long`. Check for collisions with other players before saving a mapping. Do not silently learn
from unconfirmed guesses.

This is a relatively small extension to the text pipeline. It does not train the acoustic model,
and cannot solve empty recognition results. Keep setup outside the live tracking workflow rather
than making operators maintain variants during a point.

## Option 2: Platform Recognition Customization

### iOS

Starting with iOS 17, Apple's Speech framework supports custom on-device language models through
`SFCustomLanguageModelData` and `SFSpeechLanguageModel`. Customization can include vocabulary,
phrase examples/counts, and explicit pronunciations using supported locale-specific X-SAMPA
symbols. Data can be generated at runtime and customization remains on-device.

This addresses the underlying vocabulary problem more directly than spelling-based recovery:
teach the model the spelling and pronunciation of `Lang`, or `C4` pronounced `see four`.

The installed Expo wrapper inspected for this exploration does not expose this configuration;
native integration would be necessary. Begin with a tiny model containing known troublesome
nicknames. If effective, investigate preparing and caching a roster model ahead of play, with
active-line hints updated each point. Avoid preparing a model at every mic press. Measure whether
line-specific models provide enough benefit to justify their preparation cost.

This API accepts pronunciation data; it is not itself a turnkey “record a name to train it” API.
Converting user recordings into suitable pronunciations would be separate work.

Source: [Apple: Customize on-device speech recognition](https://developer.apple.com/videos/play/wwdc2023/10101/).

### Android

No equivalent public custom-pronunciation API was identified in Android's standard
`SpeechRecognizer` interface during this exploration. Android 13/API 33 introduced
`EXTRA_BIASING_STRINGS`, which the installed Expo wrapper already uses for contextual strings.
The recognizer implementation may ignore those hints. They do not specify a word's pronunciation.

Do not assume an iOS customization improvement will transfer to Android. Recheck platform and
wrapper capabilities when implementation begins.

Sources: [RecognizerIntent biasing strings](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_BIASING_STRINGS),
[SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer).

## Option 3: Embedded Offline Engine

An embedded engine could offer more control and a shared approach across platforms, with costs in
native integration, model distribution, storage, memory, battery use, and device testing.

| Candidate | Relevant capability | Limitation to investigate |
| --- | --- | --- |
| Vosk | Vocabulary adaptation and phonetic dictionaries mapping words to sounds | Genuinely new words may require rebuilding model assets; restricting grammar alone does not teach missing pronunciations. |
| sherpa-onnx | Hotword biasing and configurable keyword spotting | Capability depends on the model; configuring a keyword does not guarantee recognition of an unusual pronunciation. |

The active-line task resembles “which of these names was spoken, or none?” Keyword spotting is
therefore worth benchmarking against general transcription. This is a hypothesis, not a claim
that either engine will outperform the current recognizer. Text-configured keyword spotting and
learning from recorded examples are distinct capabilities; verify the latter explicitly before
selecting a library.

Sources: [Vosk adaptation](https://alphacephei.com/vosk/lm),
[sherpa-onnx hotwords](https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html),
[sherpa-onnx keyword spotting](https://k2-fsa.github.io/sherpa/onnx/kws/index.html).

## Option 4: “Teach Voice Name” from Recorded Examples

The proposed experience is optional enrollment for names that default recognition struggles with.
The technical approach is query-by-example or few-shot keyword spotting: associate examples of
the spoken name with a player ID, then compare future speech with those examples without requiring
a correct text transcript. Research demonstrates that this class of system can run on-device;
accuracy for U-Stat's names and environments remains unproven.

### Proposed Enrollment Flow

1. Open a player's profile and select **Teach voice name**.
2. The tracker operator says the name several times. Start by testing 3–5 examples; this is an
   experimental enrollment budget, not an established accuracy requirement.
3. Extract and save local speech representations associated with the player's stable ID.
4. Ask for a fresh recording, separate from enrollment, to verify recognition.
5. During tap-to-speak, compare the utterance with enrolled names on the active line and accept a
   clear match or report uncertainty.
6. Allow the operator to replace or remove enrollment if it performs poorly.

The person operating the tracker should record the examples. The goal is to recognize how that
person says teammates' names, not to identify which teammate is speaking. Another operator may
need separate examples; cross-speaker generalization must be measured.

### Possible Technical Shape

A pretrained speech-feature model could produce representations for matching or a small
classifier. Enrollment need not retrain a full speech recognizer on the phone. Appropriate
representations must preserve the spoken word, rather than primarily identify the speaker.

Retain tap-to-speak for the first prototype: a bounded utterance avoids adding continuous keyword
detection among sideline conversation. Capture usable audio independently of whether the native
recognizer returns a transcript. Investigate how native recognition and an enrolled-name matcher
share audio and arbitrate results, including disagreements; blindly trusting a plausible native
result before considering enrollment could defeat the feature.

Prefer local enrollment as the initial scope. Decide whether raw recordings are needed after
feature extraction, and define deletion, model-version invalidation, and re-enrollment behavior.
Do not embed operator-specific enrollment in historical game records by default. Storage ownership,
sharing, device transfer, and association with roster IDs remain design questions.

Sources: [Query-by-example keyword spotting research](https://research.google/pubs/query-by-example-keyword-spotting-using-long-short-term-memory-networks/),
[Teaching keyword spotters new keywords with limited examples](https://arxiv.org/abs/2106.02443),
[On-device query-by-example research](https://arxiv.org/abs/1910.05171).

## Matching and Capture Requirements to Preserve

- Keep an explicit “none of these” outcome; never force every utterance to one of seven players.
- Require sufficient evidence and separation from the next candidate. Similar short names are a
  particular concern even with a small lineup.
- Prioritize explicit aliases over increasingly permissive spelling guesses. The current parser
  already allows two edits for short names and rejects equal-distance ties; loosening it further
  could silently record incorrect passes.
- Use active-line context, while preserving existing holder and capture-validity checks.
- Route accepted selections through the existing semantic pass-capture path.
- Consider lightweight confirmation such as `Lang?` for uncertain candidates and clear feedback
  about which player was selected. Keep numbers and touch available.

## Evaluation Before Product Commitment

Compare the current recognizer, explicit aliases, iOS pronunciation customization, and an
audio-example prototype using the same evaluation recordings where technically possible.

Include `Lang`, `C4`, similar-sounding teammates, ordinary names, unrelated speech, and noise-only
clips. Test several operators, fresh utterances not used for enrollment, quiet and sideline
conditions, wind, shouting, microphone distance, and representative iOS/Android devices.

Measure:

- Correct player selections, incorrect selections, and rejections separately.
- Latency from speech completion to selection.
- Enrollment effort and success on a held-out recording.
- Robustness across sessions and operators.
- Model size, preparation time, runtime memory, and battery cost.

Optimize player selection rather than exact spelling: `sea four` is useful if it reliably resolves
to C4. Wrong recorded passes matter more than attractive transcript examples. Set acceptance
criteria before deciding to ship.

## Suggested Investigation Order and Open Decisions

1. Capture a small representative benchmark of problematic names and current failure modes.
2. Try spoken aliases as the lowest-cost improvement across platforms.
3. Prototype iOS custom pronunciations to evaluate the platform capability.
4. Prototype recorded-example matching for troublesome names, especially empty-transcript cases.
5. Choose platform-specific customization, a shared embedded engine, or a hybrid based on results.

Open decisions include whether voice enrollment should be per operator/device, how much setup is
acceptable, how recognition disagreements are presented, supported locales, and whether measured
benefits justify maintaining another audio pipeline. These options are recorded for later work;
none changes current voice behavior or commits the project to numbers-only tracking.
