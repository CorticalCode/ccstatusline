import {
    describe,
    expect,
    it
} from 'vitest';

import {
    COLOR_SCHEMES,
    getColorScheme,
    getColorSchemeNames,
    type ColorScheme,
    type RGB
} from '../gauge-colors';

describe('COLOR_SCHEMES', () => {
    it('has a default scheme', () => {
        expect(COLOR_SCHEMES.default).toBeDefined();
    });

    it('has a protanopia scheme', () => {
        expect(COLOR_SCHEMES.protanopia).toBeDefined();
    });

    it('has a deuteranopia scheme', () => {
        expect(COLOR_SCHEMES.deuteranopia).toBeDefined();
    });

    it('has a high-contrast scheme', () => {
        expect(COLOR_SCHEMES['high-contrast']).toBeDefined();
    });

    it('every scheme has exactly 4 zones with valid RGB start/end', () => {
        for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
            expect(scheme.zones, `${name} zones length`).toHaveLength(4);
            for (const zone of scheme.zones) {
                for (const point of [zone.start, zone.end]) {
                    expect(point.r, `${name} r`).toBeGreaterThanOrEqual(0);
                    expect(point.r, `${name} r`).toBeLessThanOrEqual(255);
                    expect(point.g, `${name} g`).toBeGreaterThanOrEqual(0);
                    expect(point.g, `${name} g`).toBeLessThanOrEqual(255);
                    expect(point.b, `${name} b`).toBeGreaterThanOrEqual(0);
                    expect(point.b, `${name} b`).toBeLessThanOrEqual(255);
                }
            }
        }
    });

    it('every scheme has exactly 4 waypoints with valid RGB', () => {
        for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
            expect(scheme.waypoints, `${name} waypoints length`).toHaveLength(4);
            for (const wp of scheme.waypoints) {
                expect(wp.r, `${name} r`).toBeGreaterThanOrEqual(0);
                expect(wp.r, `${name} r`).toBeLessThanOrEqual(255);
            }
        }
    });

    it('every scheme has a dim value between 0 and 255', () => {
        for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
            expect(scheme.dim, name).toBeGreaterThanOrEqual(0);
            expect(scheme.dim, name).toBeLessThanOrEqual(255);
        }
    });
});

describe('getColorScheme', () => {
    it('returns default scheme for unknown name', () => {
        expect(getColorScheme('nonexistent')).toBe(COLOR_SCHEMES.default);
    });

    it('returns the named scheme', () => {
        expect(getColorScheme('protanopia')).toBe(COLOR_SCHEMES.protanopia);
    });

    it('returns default for undefined', () => {
        expect(getColorScheme(undefined)).toBe(COLOR_SCHEMES.default);
    });
});

describe('getColorSchemeNames', () => {
    it('returns all scheme names', () => {
        const names = getColorSchemeNames();
        expect(names).toContain('default');
        expect(names).toContain('protanopia');
        expect(names).toContain('deuteranopia');
        expect(names).toContain('high-contrast');
    });
});

// Verify type exports are usable
function _assertTypes(_s: ColorScheme, _r: RGB): void { /* type check only */ }
void _assertTypes;