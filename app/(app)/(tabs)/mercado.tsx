import { EmptyState, Screen, ScreenHeader } from '@/ui';

export default function MercadoTab() {
  return (
    <Screen>
      <ScreenHeader title="Mercado" />
      <EmptyState
        title="Próximamente"
        description="Venta y subasta de cromos llegan después del MVP1."
      />
    </Screen>
  );
}
