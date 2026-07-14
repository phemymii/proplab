# PropLab Expo / RN UI kit

Small **react-native-web** components that exercise PropLab’s Expo/RN preview path
without requiring a full Expo SDK install.

## What works

| Component | Uses |
|-----------|------|
| `RnButton` | `Pressable`, `Text`, `StyleSheet` |
| `RnCard` | `View` layout + nested `RnButton` |

## Requirements

```bash
# In a real Expo app you typically need:
npx expo install react-native-web react-dom
```

This example already depends on `react-native-web`.

## Run

From the PropLab repo root:

```bash
cd examples/expo-ui && npm install
cd ../..
npm run demo:expo
# open http://localhost:4591
```

## Limits (still true for real Expo apps)

PropLab previews RN via **react-native-web in a browser iframe**. It is not a
native simulator.

Expect failures for:

- Camera / sensors / bluetooth / secure store / etc.
- Many Expo modules without a web implementation (stubbed so siblings can load)
- Gesture Handler / Reanimated / native navigation stacks
- Exact pixel parity with iOS/Android

Use `.proplabrc` decorators for theme/safe-area providers the same as web apps.
