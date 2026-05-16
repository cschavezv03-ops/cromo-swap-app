import { EmptyState, Screen, ScreenHeader } from '@/ui';

export default function AvisosTab() {
  return (
    <Screen>
      <ScreenHeader title="Avisos" />
      <EmptyState
        title="Nada nuevo por aquí"
        description="Acá vas a ver matches, intercambios aceptados y novedades de tu scope."
      />
    </Screen>
  );
}
