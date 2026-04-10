import {
    describe,
    expect,
    it
} from 'vitest';

import type { RenderContext } from '../../types/RenderContext';
import type { Settings } from '../../types/Settings';
import type { WidgetItem } from '../../types/Widget';
import { ContextGaugeWidget } from '../ContextGauge';

function makeContext(usedPercentage: number | null, windowSize = 200000): RenderContext {
    return {
        data: usedPercentage !== null
            ? { context_window: { used_percentage: usedPercentage, context_window_size: windowSize } }
            : {},
        isPreview: false
    } as RenderContext;
}

function makePreviewContext(): RenderContext {
    return { data: {}, isPreview: true } as RenderContext;
}

function makeItem(metadata?: Record<string, string>): WidgetItem {
    return { id: 'test', type: 'context-gauge', metadata };
}

function makeSettings(): Settings {
    return {} as Settings;
}

const widget = new ContextGaugeWidget();

describe('ContextGaugeWidget', () => {
    describe('widget interface', () => {
        it('returns auto as default color', () => {
            expect(widget.getDefaultColor()).toBe('auto');
        });

        it('returns a description without mentioning dial', () => {
            const desc = widget.getDescription();
            expect(desc.toLowerCase()).not.toContain('dial');
        });

        it('returns Context Gauge as display name', () => {
            expect(widget.getDisplayName()).toBe('Context Gauge');
        });

        it('returns Context as category', () => {
            expect(widget.getCategory()).toBe('Context');
        });

        it('does not support raw value', () => {
            expect(widget.supportsRawValue()).toBe(false);
        });

        it('does not support external colors', () => {
            expect(widget.supportsColors(makeItem())).toBe(false);
        });
    });

    describe('render — zone mode (default)', () => {
        it('returns null when no context data', () => {
            const result = widget.render(makeItem(), makeContext(null), makeSettings());
            expect(result).toBeNull();
        });

        it('renders bar and percentage at 50%', () => {
            const result = widget.render(makeItem(), makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('50%');
            expect(result).toContain('\x1b[38;2;');
        });

        it('renders bar and percentage at 0%', () => {
            const result = widget.render(makeItem(), makeContext(0), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('0%');
        });

        it('renders bar and percentage at 100%', () => {
            const result = widget.render(makeItem(), makeContext(100), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('100%');
        });
    });

    describe('render — heat mode', () => {
        it('renders with heat gradient', () => {
            const item = makeItem({ mode: 'heat' });
            const result = widget.render(item, makeContext(80), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('80%');
            expect(result).toContain('\x1b[38;2;');
        });
    });

    describe('render — themed mode', () => {
        it('returns plain text without ANSI truecolor codes', () => {
            const item = makeItem({ mode: 'themed' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).not.toContain('\x1b[38;2;');
            expect(result).toContain('50%');
        });
    });

    describe('render — dial mode', () => {
        it('renders a dial glyph with percentage', () => {
            const item = makeItem({ mode: 'dial' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('50%');
        });
    });

    describe('render — display toggles', () => {
        it('hides bar when showBar is false', () => {
            const item = makeItem({ showBar: 'false' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toBeDefined();
            if (result === null) {
                return;
            }
            const stripped = result.replace(/\x1b\[[^m]*m/g, '');
            expect(stripped).not.toContain('●');
            expect(stripped).toContain('50%');
        });

        it('hides percentage when showPercentage is false', () => {
            const item = makeItem({ showPercentage: 'false' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toBeDefined();
            if (result === null) {
                return;
            }
            const stripped = result.replace(/\x1b\[[^m]*m/g, '');
            expect(stripped).not.toContain('%');
        });

        it('returns null when both bar and percentage are hidden', () => {
            const item = makeItem({ showBar: 'false', showPercentage: 'false' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).toBeNull();
        });

        it('shows custom label prefix', () => {
            const item = makeItem({ showBar: 'false', label: 'C: ' });
            const result = widget.render(item, makeContext(50), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('C: ');
        });
    });

    describe('render — preview', () => {
        it('renders a preview output', () => {
            const result = widget.render(makeItem(), makePreviewContext(), makeSettings());
            expect(result).not.toBeNull();
            expect(result).toContain('%');
        });
    });

    describe('handleEditorAction — mode cycling', () => {
        it('cycles from zone to heat', () => {
            const result = widget.handleEditorAction('toggle-mode', makeItem());
            expect(result?.metadata?.mode).toBe('heat');
        });

        it('cycles from heat to themed', () => {
            const result = widget.handleEditorAction('toggle-mode', makeItem({ mode: 'heat' }));
            expect(result?.metadata?.mode).toBe('themed');
        });

        it('cycles from themed to dial', () => {
            const result = widget.handleEditorAction('toggle-mode', makeItem({ mode: 'themed' }));
            expect(result?.metadata?.mode).toBe('dial');
        });

        it('cycles from dial back to zone', () => {
            const result = widget.handleEditorAction('toggle-mode', makeItem({ mode: 'dial' }));
            expect(result?.metadata?.mode).toBe('zone');
        });
    });

    describe('getCustomKeybinds', () => {
        it('includes mode toggle', () => {
            const keybinds = widget.getCustomKeybinds();
            const modeKeybind = keybinds.find(k => k.key === 'm');
            expect(modeKeybind).toBeDefined();
        });

        it('includes style toggle', () => {
            const keybinds = widget.getCustomKeybinds();
            const styleKeybind = keybinds.find(k => k.key === 's');
            expect(styleKeybind).toBeDefined();
        });

        it('includes color scheme toggle', () => {
            const keybinds = widget.getCustomKeybinds();
            const schemeKeybind = keybinds.find(k => k.key === 'c');
            expect(schemeKeybind).toBeDefined();
        });
    });
});