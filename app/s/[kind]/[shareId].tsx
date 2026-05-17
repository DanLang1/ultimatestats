import { Redirect, useLocalSearchParams } from 'expo-router';

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function ShareLinkRedirectScreen() {
  const { kind, shareId } = useLocalSearchParams<{
    kind?: string | string[];
    shareId?: string | string[];
  }>();

  const shareType = pickFirst(kind);
  const id = pickFirst(shareId);

  if (!shareType || !id) {
    return <Redirect href="/" />;
  }

  const normalizedType = shareType.toLowerCase();
  if (
    normalizedType !== 'game' &&
    normalizedType !== 'advanced-game' &&
    normalizedType !== 'advanced-games' &&
    normalizedType !== 'team' &&
    normalizedType !== 'games'
  ) {
    return <Redirect href="/" />;
  }

  return <Redirect href={{ pathname: '/Import', params: { shareId: id } }} />;
}
