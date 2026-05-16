import { EmptyState, Screen, ScreenHeader } from '@/ui';

export default function AvisosTab() {
  return (
    <Screen>
      <ScreenHeader title="Avisos" />
      <EmptyState
        title="Nada nuevo por aquí"
        description="Aquí verás matches, intercambios aceptados y novedades de tu scope."
      />
    </Screen>
  );
}
