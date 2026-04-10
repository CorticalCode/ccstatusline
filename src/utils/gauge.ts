// src/utils/gauge.ts
import type {
    ColorScheme,
    RGB
} from './gauge-colors';

export type BarStyle = 'circles' | 'blocks' | 'squares' | 'diamonds' | 'lines' | 'braille' | 'halfblocks';
export type GaugeMode = 'zone' | 'heat' | 'themed' | 'dial';

export const BAR_STYLES: Record<BarStyle, { filled: string; empty: string }> = {
    circles: { filled: '●', empty: '·' },
    blocks: { filled: '█', empty: '░' },
    squares: { filled: '■', empty: '□' },
    diamonds: { filled: '◆', empty: '◇' },
    lines: { filled: '━', empty: '╌' },
    braille: { filled: '⣿', empty: '⣀' },
    halfblocks: { filled: '▌', empty: ' ' }
};

export const DIAL_GLYPHS = ['◔', '◑', '◶', '●'] as const;

const ANSI_RESET = '\x1b[0m';

export function interpolateRGB(start: RGB, end: RGB, t: number): RGB {
    return {
        r: Math.round(start.r + (end.r - start.r) * t),
        g: Math.round(start.g + (end.g - start.g) * t),
        b: Math.round(start.b + (end.b - start.b) * t)
    };
}

export function rgbToAnsi(rgb: RGB): string {
    return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
}

export function interpolateThroughWaypoints(waypoints: RGB[], t: number): RGB {
    const segments = waypoints.length - 1;
    const scaledT = t * segments;
    const segIndex = Math.min(Math.floor(scaledT), segments - 1);
    const localT = scaledT - segIndex;
    const startWp = waypoints[segIndex] ?? { r: 0, g: 0, b: 0 };
    const endWp = waypoints[segIndex + 1] ?? waypoints[waypoints.length - 1] ?? { r: 0, g: 0, b: 0 };
    return interpolateRGB(startWp, endWp, localT);
}

export interface ZoneBarOptions {
    pct: number;
    width: number;
    shades: number;
    warnThreshold: number;
    dangerThreshold: number;
    style: BarStyle;
    scheme: ColorScheme;
}

function resolveZoneIndex(pct: number, warnThreshold: number, dangerThreshold: number): number {
    if (pct >= dangerThreshold) {
        return 2;
    }
    if (pct >= warnThreshold) {
        return 1;
    }
    return 0;
}

export function buildZoneBar(options: ZoneBarOptions): string {
    const { pct, width, shades, warnThreshold, dangerThreshold, style, scheme } = options;
    const chars = BAR_STYLES[style];

    const zoneIndex = resolveZoneIndex(pct, warnThreshold, dangerThreshold);
    const zone = scheme.zones[zoneIndex] ?? scheme.zones[0];
    const totalSteps = width * shades;
    const currentStep = Math.round((pct * totalSteps) / 100);

    let bar = '';
    for (let block = 0; block < width; block++) {
        const filledInBlock = Math.min(Math.max(currentStep - block * shades, 0), shades);
        if (filledInBlock <= 0) {
            bar += `\x1b[38;5;${scheme.dim}m${chars.empty}${ANSI_RESET}`;
        } else {
            const t = filledInBlock / shades;
            const rgb = zone !== undefined
                ? interpolateRGB(zone.start, zone.end, t)
                : { r: 0, g: 0, b: 0 };
            bar += `${rgbToAnsi(rgb)}${chars.filled}${ANSI_RESET}`;
        }
    }
    return bar;
}

export interface HeatBarOptions {
    pct: number;
    width: number;
    style: BarStyle;
    scheme: ColorScheme;
}

export function buildHeatBar(options: HeatBarOptions): string {
    const { pct, width, style, scheme } = options;
    const chars = BAR_STYLES[style];
    const filledCount = Math.round((pct / 100) * width);

    let bar = '';
    for (let i = 0; i < width; i++) {
        if (i < filledCount) {
            const t = width <= 1 ? 1 : i / (width - 1);
            const rgb = interpolateThroughWaypoints(scheme.waypoints, t);
            bar += `${rgbToAnsi(rgb)}${chars.filled}${ANSI_RESET}`;
        } else {
            bar += `\x1b[38;5;${scheme.dim}m${chars.empty}${ANSI_RESET}`;
        }
    }
    return bar;
}

export function buildPlainBar(pct: number, width: number, style: BarStyle): string {
    const chars = BAR_STYLES[style];
    const filledCount = Math.round((pct / 100) * width);
    return chars.filled.repeat(filledCount) + chars.empty.repeat(width - filledCount);
}

export interface DialOptions {
    pct: number;
    scheme: ColorScheme;
}

export function buildDial(options: DialOptions): string {
    const { pct, scheme } = options;
    const clampedPct = Math.max(0, Math.min(100, pct));

    const glyphIndex = clampedPct >= 100 ? 3 : Math.floor(clampedPct / 25);
    const glyph = DIAL_GLYPHS[glyphIndex];

    const quartileStart = glyphIndex * 25;
    const quartileSize = 25;
    const t = Math.max(0.1, (clampedPct - quartileStart) / quartileSize);

    const zone = scheme.zones[glyphIndex] ?? scheme.zones[0];
    const rgb = zone !== undefined
        ? interpolateRGB(zone.start, zone.end, t)
        : { r: 0, g: 0, b: 0 };

    return `${rgbToAnsi(rgb)}${glyph}${ANSI_RESET}`;
}

export interface ColorizeTextOptions {
    pct: number;
    text: string;
    mode: GaugeMode;
    scheme: ColorScheme;
    warnThreshold: number;
    dangerThreshold: number;
}

export function colorizeText(options: ColorizeTextOptions): string {
    const { pct, text, mode, scheme, warnThreshold, dangerThreshold } = options;

    if (mode === 'themed') {
        return text;
    }

    let rgb: RGB;
    if (mode === 'zone') {
        const zoneIndex = resolveZoneIndex(pct, warnThreshold, dangerThreshold);
        const zone = scheme.zones[zoneIndex] ?? scheme.zones[0];
        rgb = zone?.end ?? { r: 0, g: 0, b: 0 };
    } else {
        const t = Math.max(0, Math.min(1, pct / 100));
        rgb = interpolateThroughWaypoints(scheme.waypoints, t);
    }
    return `${rgbToAnsi(rgb)}${text}${ANSI_RESET}`;
}