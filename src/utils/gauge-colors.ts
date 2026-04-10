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
        { r: 22, g: 85, b: 22 },
        { r: 176, g: 136, b: 0 },
        { r: 230, g: 58, b: 54 },
        { r: 230, g: 58, b: 54 }
    ],
    dim: 245
};

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
    'default': DEFAULT_COLOR_SCHEME,
    'protanopia': {
        name: 'Protanopia',
        zones: [
            { start: { r: 10, g: 10, b: 60 }, end: { r: 40, g: 40, b: 180 } },
            { start: { r: 10, g: 50, b: 50 }, end: { r: 40, g: 180, b: 180 } },
            { start: { r: 50, g: 38, b: 0 }, end: { r: 176, g: 136, b: 0 } },
            { start: { r: 140, g: 140, b: 140 }, end: { r: 255, g: 255, b: 255 } }
        ],
        waypoints: [
            { r: 40, g: 40, b: 180 },
            { r: 40, g: 180, b: 180 },
            { r: 176, g: 136, b: 0 },
            { r: 255, g: 255, b: 255 }
        ],
        dim: 245
    },
    'deuteranopia': {
        name: 'Deuteranopia',
        zones: [
            { start: { r: 10, g: 10, b: 60 }, end: { r: 40, g: 40, b: 180 } },
            { start: { r: 60, g: 30, b: 0 }, end: { r: 200, g: 100, b: 0 } },
            { start: { r: 50, g: 38, b: 0 }, end: { r: 176, g: 136, b: 0 } },
            { start: { r: 140, g: 140, b: 140 }, end: { r: 255, g: 255, b: 255 } }
        ],
        waypoints: [
            { r: 40, g: 40, b: 180 },
            { r: 200, g: 100, b: 0 },
            { r: 176, g: 136, b: 0 },
            { r: 255, g: 255, b: 255 }
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