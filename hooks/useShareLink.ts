import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';

function extractShareId(url: string): string | null {
  // Handle universal links: https://u-stat.app/s/game/<id>, /s/team/<id>, or /s/games/<id>
  const universalMatch = url.match(/u-stat\.app\/s\/(?:game|team|games)\/([a-z0-9]+)/i);
  if (universalMatch) return universalMatch[1];

  // Handle app scheme: ultimatestats://s/game/<id>, /s/team/<id>, or /s/games/<id>
  const schemeMatch = url.match(/ultimatestats(?:-dev)?:\/\/s\/(?:game|team|games)\/([a-z0-9]+)/i);
  if (schemeMatch) return schemeMatch[1];

  return null;
}

function handleUrl(url: string) {
  const shareId = extractShareId(url);
  if (!shareId) return;

  router.navigate({ pathname: '/Import', params: { shareId } });
}

export function useShareLink() {
  // Handle URL that opened the app (cold start)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
  }, []);

  // Handle URL while app is already open (warm start)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });
    return () => subscription.remove();
  }, []);
}
