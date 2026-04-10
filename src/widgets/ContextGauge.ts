import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { getContextWindowMetrics } from '../utils/context-window';
import type {
    BarStyle,
    GaugeMode
} from '../utils/gauge';
import {
    BAR_STYLES,
    buildDial,
    buildHeatBar,
    buildPlainBar,
    buildZoneBar,
    colorizeText
} from '../utils/gauge';
import {
    getColorScheme,
    getColorSchemeNames
} from '../utils/gauge-colors';
import {
    getContextConfig,
    getModelContextIdentifier
} from '../utils/model-context';

const MODE_CYCLE: GaugeMode[] = ['zone', 'heat', 'themed', 'dial'];
const STYLE_NAMES = Object.keys(BAR_STYLES) as BarStyle[];

function getMode(item: WidgetItem): GaugeMode {
    const mode = item.metadata?.mode;
    if (mode === 'zone' || mode === 'heat' || mode === 'themed' || mode === 'dial') {
        return mode;
    }
    return 'zone';
}

function getStyle(item: WidgetItem): BarStyle {
    const style = item.metadata?.style;
    if (style !== undefined && style in BAR_STYLES) {
        return style as BarStyle;
    }
    return 'circles';
}

function getWidth(item: WidgetItem): number {
    const width = Number(item.metadata?.width);
    if (Number.isFinite(width) && width >= 5 && width <= 30) {
        return Math.round(width);
    }
    return 10;
}

function getShades(item: WidgetItem): number {
    const shades = Number(item.metadata?.shades);
    if (Number.isFinite(shades) && shades >= 3 && shades <= 10) {
        return Math.round(shades);
    }
    return 5;
}

function getThreshold(item: WidgetItem, key: string, fallback: number): number {
    const value = Number(item.metadata?.[key]);
    if (Number.isFinite(value) && value >= 1 && value <= 99) {
        return Math.round(value);
    }
    return fallback;
}

function getShowBar(item: WidgetItem): boolean {
    return item.metadata?.showBar !== 'false';
}

function getShowPercentage(item: WidgetItem): boolean {
    return item.metadata?.showPercentage !== 'false';
}

function getLabel(item: WidgetItem): string {
    return item.metadata?.label ?? '';
}

function resolvePercentage(context: RenderContext): number | null {
    const metrics = getContextWindowMetrics(context.data);

    if (metrics.usedPercentage !== null) {
        return Math.round(metrics.usedPercentage);
    }

    if (context.tokenMetrics) {
        const modelId = getModelContextIdentifier(context.data?.model);
        const config = getContextConfig(modelId, metrics.windowSize);
        return Math.round(Math.min(100, (context.tokenMetrics.contextLength / config.maxTokens) * 100));
    }

    return null;
}

export class ContextGaugeWidget implements Widget {
    getDefaultColor(): string { return 'auto'; }
    getDescription(): string { return 'Gradient context gauge with configurable bar styles, color schemes, and percentage display'; }
    getDisplayName(): string { return 'Context Gauge'; }
    getCategory(): string { return 'Context'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const mode = getMode(item);
        const modifiers: string[] = [mode];

        if (mode !== 'dial') {
            modifiers.push(getStyle(item));
        }

        return {
            displayText: this.getDisplayName(),
            modifierText: `(${modifiers.join(', ')})`
        };
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(_item: WidgetItem): boolean { return false; }

    render(item: WidgetItem, context: RenderContext, _settings: Settings): string | null {
        const mode = getMode(item);
        const showBar = mode === 'dial' ? false : getShowBar(item);
        const showPct = getShowPercentage(item);
        const label = getLabel(item);
        const scheme = getColorScheme(item.metadata?.colorScheme);
        const style = getStyle(item);
        const width = getWidth(item);
        const warnThreshold = getThreshold(item, 'warnThreshold', 75);
        const dangerThreshold = getThreshold(item, 'dangerThreshold', 90);

        if (!showBar && !showPct && mode !== 'dial') {
            return null;
        }

        if (context.isPreview) {
            return this.compose(42, mode, showBar, showPct, label, style, width, getShades(item), warnThreshold, dangerThreshold, scheme);
        }

        const pct = resolvePercentage(context);
        if (pct === null) {
            return null;
        }

        return this.compose(pct, mode, showBar, showPct, label, style, width, getShades(item), warnThreshold, dangerThreshold, scheme);
    }

    private compose(
        pct: number, mode: GaugeMode, showBar: boolean, showPct: boolean, label: string,
        style: BarStyle, width: number, shades: number,
        warnThreshold: number, dangerThreshold: number, scheme: ReturnType<typeof getColorScheme>
    ): string {
        const parts: string[] = [];

        if (label) {
            parts.push(label);
        }

        if (mode === 'dial') {
            parts.push(buildDial({ pct, scheme }));
            if (showPct) {
                parts.push(' ');
                parts.push(colorizeText({ pct, text: `${pct}%`, mode: 'heat', scheme, warnThreshold, dangerThreshold }));
            }
            return parts.join('');
        }

        if (showBar) {
            if (mode === 'zone') {
                parts.push(buildZoneBar({ pct, width, shades, warnThreshold, dangerThreshold, style, scheme }));
            } else if (mode === 'heat') {
                parts.push(buildHeatBar({ pct, width, style, scheme }));
            } else {
                parts.push(buildPlainBar(pct, width, style));
            }
        }

        if (showPct) {
            if (showBar) {
                parts.push(' ');
            }
            parts.push(colorizeText({ pct, text: `${pct}%`, mode, scheme, warnThreshold, dangerThreshold }));
        }

        return parts.join('');
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        if (action === 'toggle-mode') {
            const current = getMode(item);
            const nextIndex = (MODE_CYCLE.indexOf(current) + 1) % MODE_CYCLE.length;
            const nextMode = MODE_CYCLE[nextIndex] ?? 'zone';
            return { ...item, metadata: { ...(item.metadata ?? {}), mode: nextMode } };
        }

        if (action === 'toggle-style') {
            const current = getStyle(item);
            const nextIndex = (STYLE_NAMES.indexOf(current) + 1) % STYLE_NAMES.length;
            const nextStyle = STYLE_NAMES[nextIndex] ?? 'circles';
            return { ...item, metadata: { ...(item.metadata ?? {}), style: nextStyle } };
        }

        if (action === 'toggle-scheme') {
            const names = getColorSchemeNames();
            const current = item.metadata?.colorScheme ?? 'default';
            const nextIndex = (names.indexOf(current) + 1) % names.length;
            const nextScheme = names[nextIndex] ?? 'default';
            return { ...item, metadata: { ...(item.metadata ?? {}), colorScheme: nextScheme } };
        }

        return null;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 'm', label: '(m)ode: zone/heat/themed', action: 'toggle-mode' },
            { key: 's', label: '(s)tyle', action: 'toggle-style' },
            { key: 'c', label: '(c)olor scheme', action: 'toggle-scheme' }
        ];
    }
}