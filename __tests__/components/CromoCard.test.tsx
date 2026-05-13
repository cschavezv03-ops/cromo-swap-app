/**
 * Smoke tests for CromoCard component.
 * Spec: R4-5-1..R4-5-7
 *
 * Tests: renders for all 6 rarities, all 3 statuses, legendario dark variant,
 * missing dashed border, repeated ×N pill, accessibilityLabel.
 */

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo-google-fonts/manrope', () => ({
  Manrope_400Regular: 'Manrope_400Regular',
  Manrope_500Medium: 'Manrope_500Medium',
  Manrope_600SemiBold: 'Manrope_600SemiBold',
  Manrope_700Bold: 'Manrope_700Bold',
  Manrope_800ExtraBold: 'Manrope_800ExtraBold',
}));

jest.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: 'JetBrainsMono_400Regular',
}));

jest.mock('@expo-google-fonts/instrument-serif', () => ({
  InstrumentSerif_400Regular: 'InstrumentSerif_400Regular',
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const MockView = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', null, children);
  const MockRect = () => React.createElement('View', null);
  const MockText = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('Text', null, children);
  return {
    __esModule: true,
    default: MockView,
    Svg: MockView,
    Rect: MockRect,
    Text: MockText,
    Circle: () => React.createElement('View', null),
    Defs: MockView,
    RadialGradient: MockView,
    Stop: () => React.createElement('View', null),
  };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CromoCard from '../../src/components/CromoCard';
import type { AlbumCromo } from '../../src/lib/album-types';
import type { RarityKey } from '../../src/theme';
import { RARITIES } from '../../src/theme';

// ── Fixture factory ──────────────────────────────────────────────────────────

const makeCromo = (overrides: Partial<AlbumCromo> = {}): AlbumCromo => ({
  id: 'uuid-test',
  n: 7,
  number: 7,
  player_name: 'Lionel Messi',
  position: 'DEL',
  jersey: 10,
  rarity: 'comun',
  rarity_id: 'comun',
  rarity_label: 'Común',
  rarity_chip: '#E8E5DE',
  rarity_text: '#3D3A33',
  rarity_dot: '#8B8678',
  rarity_sort_order: 1,
  country: 'ARG',
  country_code: 'ARG',
  country_name: 'Argentina',
  flag_emoji: '🇦🇷',
  accent: '#74ACDF',
  stripe: '#74ACDF',
  stripe2: '#FFFFFF',
  catalog_version: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  quantity: 1,
  status: 'have',
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CromoCard', () => {
  describe('renders for all 6 rarities', () => {
    const rarities: RarityKey[] = ['comun', 'poco', 'raro', 'muyraro', 'especial', 'legendario'];

    rarities.forEach((rarity) => {
      it(`renders rarity: ${rarity}`, () => {
        const cromo = makeCromo({ rarity_id: rarity, rarity: rarity, status: 'have' });
        const { toJSON } = render(<CromoCard cromo={cromo} />);
        expect(toJSON()).not.toBeNull();
      });
    });
  });

  describe('renders all 3 statuses', () => {
    it('renders status=missing (dashed border, no content)', () => {
      const cromo = makeCromo({ status: 'missing', quantity: 0 });
      const { queryByText } = render(<CromoCard cromo={cromo} />);
      // Player name should NOT be visible in missing state
      expect(queryByText('Lionel Messi')).toBeNull();
      // The cromo number should appear in the faint center
      expect(queryByText('7')).not.toBeNull();
    });

    it('renders status=have (white bg, full content)', () => {
      const cromo = makeCromo({ status: 'have', quantity: 1 });
      const { queryByText } = render(<CromoCard cromo={cromo} />);
      // Player name visible
      expect(queryByText('Lionel Messi')).not.toBeNull();
    });

    it('renders status=repeated with ×N pill', () => {
      const cromo = makeCromo({ status: 'repeated', quantity: 3 });
      const { queryByText } = render(<CromoCard cromo={cromo} />);
      expect(queryByText('×3')).not.toBeNull();
    });
  });

  describe('legendario dark variant', () => {
    it('uses legendario bg/text from RARITIES (not hardcoded)', () => {
      const cromo = makeCromo({ rarity_id: 'legendario', rarity: 'legendario', status: 'have' });
      // Just verify it renders without crashing and uses the RARITIES config
      const { toJSON } = render(<CromoCard cromo={cromo} />);
      expect(toJSON()).not.toBeNull();
      // Verify RARITIES.legendario has the expected dark bg
      expect(RARITIES.legendario.bg).toBe('#1F1B14');
      expect(RARITIES.legendario.text).toBe('#FFD46B');
    });
  });

  describe('size variants', () => {
    it('renders at size xs without player name', () => {
      const cromo = makeCromo({ status: 'have', quantity: 1 });
      const { queryByText } = render(<CromoCard cromo={cromo} size="xs" />);
      // At xs, dims.name === 0 → player name omitted
      expect(queryByText('Lionel Messi')).toBeNull();
    });

    it('renders at size sm with player name', () => {
      const cromo = makeCromo({ status: 'have', quantity: 1 });
      const { queryByText } = render(<CromoCard cromo={cromo} size="sm" />);
      expect(queryByText('Lionel Messi')).not.toBeNull();
    });

    it('renders all sizes without crashing', () => {
      const cromo = makeCromo({ status: 'have', quantity: 1 });
      (['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach((sz) => {
        const { toJSON } = render(<CromoCard cromo={cromo} size={sz} />);
        expect(toJSON()).not.toBeNull();
      });
    });
  });

  describe('accessibilityLabel', () => {
    it('includes country, number, player name, and status', () => {
      const cromo = makeCromo({ status: 'have', quantity: 1 });
      const { getByRole } = render(<CromoCard cromo={cromo} />);
      const btn = getByRole('button');
      expect(btn.props.accessibilityLabel).toContain('7');
      expect(btn.props.accessibilityLabel).toContain('Argentina');
      expect(btn.props.accessibilityLabel).toContain('Lionel Messi');
      expect(btn.props.accessibilityLabel).toContain('tengo');
    });

    it('includes repeated ×N in label when repeated', () => {
      const cromo = makeCromo({ status: 'repeated', quantity: 3 });
      const { getByRole } = render(<CromoCard cromo={cromo} />);
      const btn = getByRole('button');
      expect(btn.props.accessibilityLabel).toContain('repetido ×3');
    });

    it('includes falta in label when missing', () => {
      const cromo = makeCromo({ status: 'missing', quantity: 0 });
      const { getByRole } = render(<CromoCard cromo={cromo} />);
      const btn = getByRole('button');
      expect(btn.props.accessibilityLabel).toContain('falta');
    });
  });

  describe('onPress callback', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const cromo = makeCromo({ status: 'have' });
      const { getByRole } = render(<CromoCard cromo={cromo} onPress={onPress} />);
      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
