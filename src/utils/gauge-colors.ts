export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface GradientZone {
    start: RGB;
    end: RGB;
}

export interface ColorScheme {
    name: string;
    zones: GradientZone[];
    waypoints: RGB[];
    dim: number;
}

const DEFAULT_COLOR_SCHEME: ColorScheme = {
    name: 'Default',
    zones: [
        { start: { r: 6, g: 22, b: 6 }, end: { r: 22, g: 85, b: 22 } },
        { start: { r: 50, g: 38, b: 0 }, end: { r: 176, g: 136, b: 0 } },
        { start: { r: 55, g: 10, b: 8 }, end: { r: 230, g: 58, b: 54 } },
        { start: { r: 55, g: 10, b: 8 }, end: { r: 230, g: 58, b: 54 } }
    ],
    waypoints: [
        { r: 70, g: 70, b: 220 },
        { r: 22, g: 85, b: 22 },
        { r: 176, g: 136, b: 0 },
        { r: 230, g: 58, b: 54 }
    ],
    dim: 245
};

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
    'default': DEFAULT_COLOR_SCHEME,
    'accessible': {
        name: 'Accessible (Okabe-Ito)',
        zones: [
            { start: { r: 0, g: 57, b: 89 }, end: { r: 86, g: 180, b: 233 } },
            { start: { r: 120, g: 114, b: 33 }, end: { r: 240, g: 228, b: 66 } },
            { start: { r: 107, g: 47, b: 0 }, end: { r: 213, g: 94, b: 0 } },
            { start: { r: 107, g: 47, b: 0 }, end: { r: 213, g: 94, b: 0 } }
        ],
        waypoints: [
            { r: 0, g: 114, b: 178 },
            { r: 86, g: 180, b: 233 },
            { r: 240, g: 228, b: 66 },
            { r: 213, g: 94, b: 0 }
        ],
        dim: 245
    },
    'high-contrast': {
        name: 'High Contrast',
        zones: [
            { start: { r: 40, g: 40, b: 40 }, end: { r: 100, g: 100, b: 100 } },
            { start: { r: 100, g: 100, b: 100 }, end: { r: 180, g: 180, b: 180 } },
            { start: { r: 180, g: 180, b: 180 }, end: { r: 255, g: 255, b: 255 } },
            { start: { r: 180, g: 180, b: 180 }, end: { r: 255, g: 255, b: 255 } }
        ],
        waypoints: [
            { r: 100, g: 100, b: 100 },
            { r: 180, g: 180, b: 180 },
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 255, b: 255 }
        ],
        dim: 240
    }
};

export function getColorScheme(name: string | undefined): ColorScheme {
    const scheme = name !== undefined ? COLOR_SCHEMES[name] : undefined;
    return scheme ?? DEFAULT_COLOR_SCHEME;
}

export function getColorSchemeNames(): string[] {
    return Object.keys(COLOR_SCHEMES);
}