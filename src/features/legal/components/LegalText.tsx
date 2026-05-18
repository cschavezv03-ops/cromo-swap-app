import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Renderer minimalista de Markdown legal. Soporta solo el subset que usamos
 * en content.ts: H1 (#), H2 (##), H3 (###), separadores (---), bold (**x**),
 * tablas (| a | b |), divisores horizontales, bullets (-), y párrafos.
 *
 * Es voluntariamente simple — no instalamos react-native-markdown para no
 * meter una dep pesada solo para 2 pantallas legales.
 */
export function LegalText({ source }: { source: string }) {
  const { colors } = useTheme();
  const lines = source.split('\n');
  const out: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let key = 0;

  const flushTable = () => {
    if (!inTable) return;
    out.push(
      <View
        key={key++}
        style={{
          marginVertical: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {[tableHeader, ...tableRows].map((row, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              backgroundColor: i === 0 ? colors.surface : 'transparent',
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.border,
            }}
          >
            {row.map((cell, j) => (
              <View
                key={j}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRightWidth: j < row.length - 1 ? 1 : 0,
                  borderRightColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: i === 0 ? colors.textPrimary : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: i === 0 ? '600' : '400',
                  }}
                >
                  {renderInline(cell, colors)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>,
    );
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Tablas markdown: detectamos | a | b |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      // Línea separadora: |---|---|
      if (cells.every((c) => /^-+$/.test(c) || c === '')) continue;
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed === '---') {
      out.push(
        <View
          key={key++}
          style={{
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 16,
          }}
        />,
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      out.push(
        <Text
          key={key++}
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: colors.textPrimary,
            marginTop: 8,
            marginBottom: 12,
            letterSpacing: -0.5,
            lineHeight: 32,
          }}
        >
          {trimmed.slice(2)}
        </Text>,
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      out.push(
        <Text
          key={key++}
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          {trimmed.slice(3)}
        </Text>,
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      out.push(
        <Text
          key={key++}
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          {trimmed.slice(4)}
        </Text>,
      );
      continue;
    }
    if (trimmed.startsWith('- ')) {
      out.push(
        <View key={key++} style={{ flexDirection: 'row', marginVertical: 3 }}>
          <Text style={{ color: colors.textSecondary, marginRight: 8 }}>•</Text>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 22,
            }}
          >
            {renderInline(trimmed.slice(2), colors)}
          </Text>
        </View>,
      );
      continue;
    }
    if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      out.push(
        <Text
          key={key++}
          style={{
            fontSize: 12,
            fontStyle: 'italic',
            color: colors.textTertiary,
            marginTop: 16,
            lineHeight: 18,
          }}
        >
          {trimmed.slice(1, -1)}
        </Text>,
      );
      continue;
    }
    if (trimmed === '') {
      out.push(<View key={key++} style={{ height: 6 }} />);
      continue;
    }
    // Párrafo
    out.push(
      <Text
        key={key++}
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 22,
          marginVertical: 3,
        }}
      >
        {renderInline(trimmed, colors)}
      </Text>,
    );
  }
  flushTable();

  return <View>{out}</View>;
}

/** Render inline: **bold** → Text bold. Resto es texto plano. */
function renderInline(text: string, colors: { textPrimary: string }): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700', color: colors.textPrimary }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}
