import { EmptyState, Screen, ScreenHeader } from '@/ui';

export default function MatchesTab() {
  return (
    <Screen>
      <ScreenHeader title="Matches" />
      <EmptyState
        title="Sin matches todavía"
        description="Agrega cromos repetidos para empezar a encontrar intercambios."
      />
    </Screen>
  );
}
