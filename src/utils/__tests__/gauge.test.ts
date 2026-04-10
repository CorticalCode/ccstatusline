// src/utils/__tests__/gauge.test.ts
import {
    describe,
    expect,
    it
} from 'vitest';

import {
    BAR_STYLES,
    DIAL_GLYPHS,
    buildDial,
    buildHeatBar,
    buildPlainBar,
    buildZoneBar,
    colorizeText,
    interpolateRGB,
    interpolateThroughWaypoints,
    rgbToAnsi
} from '../gauge';
import { getColorScheme } from '../gauge-colors';

const scheme = getColorScheme('default');
const ANSI_RESET = '\x1b[0m';

describe('interpolateRGB', () => {
    it('returns start at t=0', () => {
        const start = { r: 0, g: 0, b: 0 };
        const end = { r: 255, g: 255, b: 255 };
        expect(interpolateRGB(start, end, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns end at t=1', () => {
        const start = { r: 0, g: 0, b: 0 };
        const end = { r: 255, g: 255, b: 255 };
        expect(interpolateRGB(start, end, 1)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('returns midpoint at t=0.5', () => {
        const start = { r: 0, g: 0, b: 0 };
        const end = { r: 200, g: 100, b: 50 };
        const mid = interpolateRGB(start, end, 0.5);
        expect(mid).toEqual({ r: 100, g: 50, b: 25 });
    });
});

describe('rgbToAnsi', () => {
    it('returns a truecolor ANSI escape', () => {
        expect(rgbToAnsi({ r: 22, g: 85, b: 22 })).toBe('\x1b[38;2;22;85;22m');
    });
});

describe('interpolateThroughWaypoints', () => {
    const waypoints = [
        { r: 0, g: 0, b: 0 },
        { r: 100, g: 100, b: 100 },
        { r: 200, g: 200, b: 200 }
    ];

    it('returns first waypoint at t=0', () => {
        expect(interpolateThroughWaypoints(waypoints, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns last waypoint at t=1', () => {
        expect(interpolateThroughWaypoints(waypoints, 1)).toEqual({ r: 200, g: 200, b: 200 });
    });

    it('interpolates between first two waypoints at t=0.25', () => {
        const result = interpolateThroughWaypoints(waypoints, 0.25);
        expect(result).toEqual({ r: 50, g: 50, b: 50 });
    });

    it('returns midpoint waypoint at t=0.5', () => {
        expect(interpolateThroughWaypoints(waypoints, 0.5)).toEqual({ r: 100, g: 100, b: 100 });
    });
});

describe('BAR_STYLES', () => {
    it('has 7 styles', () => {
        expect(Object.keys(BAR_STYLES)).toHaveLength(7);
    });

    it('each style has filled and empty characters', () => {
        for (const [name, style] of Object.entries(BAR_STYLES)) {
            expect(style.filled, `${name} filled`).toBeTruthy();
            expect(style.empty, `${name} empty defined`).toBeDefined();
        }
    });
});

describe('buildZoneBar', () => {
    it('returns all empty at 0%', () => {
        const bar = buildZoneBar({ pct: 0, width: 5, shades: 5, warnThreshold: 75, dangerThreshold: 90, style: 'circles', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('·····');
    });

    it('returns all filled at 100%', () => {
        const bar = buildZoneBar({ pct: 100, width: 5, shades: 5, warnThreshold: 75, dangerThreshold: 90, style: 'circles', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('●●●●●');
    });

    it('returns half filled at 50%', () => {
        const bar = buildZoneBar({ pct: 50, width: 10, shades: 5, warnThreshold: 75, dangerThreshold: 90, style: 'circles', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        const filled = (stripped.match(/●/g) ?? []).length;
        const empty = (stripped.match(/·/g) ?? []).length;
        expect(filled).toBe(5);
        expect(empty).toBe(5);
    });

    it('contains ANSI escape codes', () => {
        const bar = buildZoneBar({ pct: 50, width: 5, shades: 5, warnThreshold: 75, dangerThreshold: 90, style: 'circles', scheme });
        expect(bar).toContain('\x1b[38;2;');
    });

    it('uses different bar style characters', () => {
        const bar = buildZoneBar({ pct: 50, width: 5, shades: 5, warnThreshold: 75, dangerThreshold: 90, style: 'blocks', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toContain('█');
        expect(stripped).toContain('░');
    });
});

describe('buildHeatBar', () => {
    it('returns all empty at 0%', () => {
        const bar = buildHeatBar({ pct: 0, width: 5, style: 'circles', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('·····');
    });

    it('returns all filled at 100%', () => {
        const bar = buildHeatBar({ pct: 100, width: 5, style: 'circles', scheme });
        const stripped = bar.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('●●●●●');
    });

    it('contains different ANSI colors for different positions', () => {
        const bar = buildHeatBar({ pct: 100, width: 5, style: 'circles', scheme });
        const ansiCodes = bar.match(/\x1b\[38;2;(\d+;\d+;\d+)m/g) ?? [];
        const uniqueCodes = new Set(ansiCodes);
        expect(uniqueCodes.size).toBeGreaterThan(1);
    });

    it('adapts to width', () => {
        const bar5 = buildHeatBar({ pct: 100, width: 5, style: 'circles', scheme });
        const bar10 = buildHeatBar({ pct: 100, width: 10, style: 'circles', scheme });
        const stripped5 = bar5.replace(/\x1b\[[^m]*m/g, '');
        const stripped10 = bar10.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped5).toHaveLength(5);
        expect(stripped10).toHaveLength(10);
    });
});

describe('buildPlainBar', () => {
    it('returns plain characters without ANSI', () => {
        const bar = buildPlainBar(50, 10, 'circles');
        expect(bar).not.toContain('\x1b');
        expect(bar).toBe('●●●●●·····');
    });
});

describe('buildDial', () => {
    it('returns first glyph at 0%', () => {
        const dial = buildDial({ pct: 0, scheme });
        const stripped = dial.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('◔');
    });

    it('returns second glyph at 30%', () => {
        const dial = buildDial({ pct: 30, scheme });
        const stripped = dial.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('◑');
    });

    it('returns third glyph at 60%', () => {
        const dial = buildDial({ pct: 60, scheme });
        const stripped = dial.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('◶');
    });

    it('returns fourth glyph at 100%', () => {
        const dial = buildDial({ pct: 100, scheme });
        const stripped = dial.replace(/\x1b\[[^m]*m/g, '');
        expect(stripped).toBe('●');
    });

    it('contains ANSI truecolor escape', () => {
        const dial = buildDial({ pct: 50, scheme });
        expect(dial).toContain('\x1b[38;2;');
    });

    it('clamps to 0-100', () => {
        const dialNeg = buildDial({ pct: -10, scheme });
        const dial0 = buildDial({ pct: 0, scheme });
        expect(dialNeg.replace(/\x1b\[[^m]*m/g, '')).toBe(dial0.replace(/\x1b\[[^m]*m/g, ''));
    });
});

describe('colorizeText', () => {
    it('wraps text in ANSI truecolor for zone mode', () => {
        const result = colorizeText({ pct: 50, text: '50%', mode: 'zone', scheme, warnThreshold: 75, dangerThreshold: 90 });
        expect(result).toContain('50%');
        expect(result).toContain('\x1b[38;2;');
        expect(result).toContain(ANSI_RESET);
    });

    it('uses zone 2 color when above warn threshold', () => {
        const below = colorizeText({ pct: 50, text: '50%', mode: 'zone', scheme, warnThreshold: 75, dangerThreshold: 90 });
        const above = colorizeText({ pct: 80, text: '80%', mode: 'zone', scheme, warnThreshold: 75, dangerThreshold: 90 });
        const belowAnsi = /\x1b\[38;2;(\d+;\d+;\d+)m/.exec(below)?.[1];
        const aboveAnsi = /\x1b\[38;2;(\d+;\d+;\d+)m/.exec(above)?.[1];
        expect(belowAnsi).not.toBe(aboveAnsi);
    });

    it('varies color by percentage in heat mode', () => {
        const low = colorizeText({ pct: 10, text: '10%', mode: 'heat', scheme, warnThreshold: 75, dangerThreshold: 90 });
        const high = colorizeText({ pct: 90, text: '90%', mode: 'heat', scheme, warnThreshold: 75, dangerThreshold: 90 });
        const lowAnsi = /\x1b\[38;2;(\d+;\d+;\d+)m/.exec(low)?.[1];
        const highAnsi = /\x1b\[38;2;(\d+;\d+;\d+)m/.exec(high)?.[1];
        expect(lowAnsi).not.toBe(highAnsi);
    });

    it('returns plain text for themed mode', () => {
        const result = colorizeText({ pct: 50, text: '50%', mode: 'themed', scheme, warnThreshold: 75, dangerThreshold: 90 });
        expect(result).toBe('50%');
        expect(result).not.toContain('\x1b');
    });
});

describe('DIAL_GLYPHS', () => {
    it('has 4 glyphs', () => {
        expect(DIAL_GLYPHS).toHaveLength(4);
    });
});