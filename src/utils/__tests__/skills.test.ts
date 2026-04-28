import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    getSkillsFilePath,
    getSkillsMetrics,
    recordSkillInvocation
} from '../skills';

let testHomeDir = '';

function writeSkillsLog(sessionId: string, lines: string[]): void {
    const skillsPath = getSkillsFilePath(sessionId);
    fs.mkdirSync(path.dirname(skillsPath), { recursive: true });
    fs.writeFileSync(skillsPath, lines.join('\n'), 'utf-8');
}

describe('skills metrics', () => {
    beforeEach(() => {
        testHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccstatusline-home-'));
        vi.spyOn(os, 'homedir').mockReturnValue(testHomeDir);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (testHomeDir) {
            fs.rmSync(testHomeDir, { recursive: true, force: true });
        }
    });

    it('uses ~/.cache/ccstatusline/skills path for skill logs', () => {
        expect(getSkillsFilePath('session-1')).toBe(
            path.join(testHomeDir, '.cache', 'ccstatusline', 'skills', 'skills-session-1.jsonl')
        );
    });

    it('returns total, unique (most-recent-first), and last skill from a valid log', () => {
        writeSkillsLog('session-1', [
            JSON.stringify({ skill: 'commit', session_id: 'session-1' }),
            JSON.stringify({ skill: 'review-pr', session_id: 'session-1' }),
            JSON.stringify({ skill: 'lint', session_id: 'session-1' }),
            JSON.stringify({ skill: 'commit', session_id: 'session-1' })
        ]);

        expect(getSkillsMetrics('session-1')).toEqual({
            totalInvocations: 4,
            uniqueSkills: ['commit', 'lint', 'review-pr'],
            lastSkill: 'commit'
        });
    });

    it('returns EMPTY metrics for an unknown session (missing cache file)', () => {
        expect(getSkillsMetrics('never-recorded')).toEqual({
            totalInvocations: 0,
            uniqueSkills: [],
            lastSkill: null
        });
    });

    it('filters malformed JSONL lines and returns only valid invocations', () => {
        writeSkillsLog('mixed-session', [
            JSON.stringify({ skill: 'commit', session_id: 'mixed-session' }),
            '{ this is not valid json',
            JSON.stringify({ skill: 'review-pr', session_id: 'mixed-session' }),
            JSON.stringify({ skill: 'commit', session_id: 'mixed-session' })
        ]);

        const metrics = getSkillsMetrics('mixed-session');
        expect(metrics.totalInvocations).toBe(3);
        expect(metrics.uniqueSkills).toEqual(['commit', 'review-pr']);
        expect(metrics.lastSkill).toBe('commit');
    });

    it('sanitizes path traversal in session ID', () => {
        const malicious = '../../../../../../tmp/pwn';
        const filePath = getSkillsFilePath(malicious);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, '');

        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        const files = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : [];
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/^skills-[a-zA-Z0-9_-]+\.jsonl$/);

        expect(fs.existsSync('/tmp/pwn.jsonl')).toBe(false);
        // Cleanup if the traversal succeeded (prevents stray files on TDD red state)
        fs.rmSync('/tmp/pwn.jsonl', { force: true });
    });

    it('hashes empty session ID to avoid blank filename leaf', () => {
        recordSkillInvocation('', 'commit', 'PreToolUse');
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        const files = fs.readdirSync(cacheDir);
        expect(files.length).toBe(1);
        expect(files[0]).not.toBe('skills-.jsonl');
        expect(files[0]).toMatch(/^skills-[a-f0-9]{32}\.jsonl$/);
    });

    it('hashes session IDs that contain only illegal characters to avoid collision', () => {
        // Without hashing, both '....' and '!!!!' would sanitize to '____' and collide.
        recordSkillInvocation('....', 'commit', 'PreToolUse');
        recordSkillInvocation('!!!!', 'review-pr', 'PreToolUse');
        expect(getSkillsMetrics('....').lastSkill).toBe('commit');
        expect(getSkillsMetrics('!!!!').lastSkill).toBe('review-pr');
    });

    it('does not throw on write failure', () => {
        vi.spyOn(os, 'homedir').mockReturnValue('/nonexistent/readonly/path');
        expect(() => {
            recordSkillInvocation('test', 'commit', 'PreToolUse');
        }).not.toThrow();
    });

    it.skipIf(process.platform === 'win32')('returns EMPTY metrics when skills file is a symlink', () => {
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        fs.mkdirSync(cacheDir, { recursive: true });
        const realPath = path.join(testHomeDir, 'real.jsonl');
        fs.writeFileSync(realPath, JSON.stringify({ skill: 'pwned', session_id: 'symlink-test' }));

        const sessionId = 'symlink-test';
        const symlinkPath = path.join(cacheDir, `skills-${sessionId}.jsonl`);
        fs.symlinkSync(realPath, symlinkPath);

        const metrics = getSkillsMetrics(sessionId);
        expect(metrics).toEqual({ totalInvocations: 0, uniqueSkills: [], lastSkill: null });
    });

    it('returns EMPTY metrics when skills file exceeds size cap', () => {
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        fs.mkdirSync(cacheDir, { recursive: true });
        const filePath = path.join(cacheDir, 'skills-big-test.jsonl');
        fs.writeFileSync(filePath, 'a'.repeat(1024 * 1024 + 100));

        const metrics = getSkillsMetrics('big-test');
        expect(metrics).toEqual({ totalInvocations: 0, uniqueSkills: [], lastSkill: null });
    });

    it('records and reads back a skill invocation', () => {
        recordSkillInvocation('rec-session', 'commit', 'PreToolUse');
        expect(getSkillsMetrics('rec-session')).toEqual({
            totalInvocations: 1,
            uniqueSkills: ['commit'],
            lastSkill: 'commit'
        });
    });

    it('records sequential invocations monotonically', () => {
        recordSkillInvocation('seq-session', 'commit', 'PreToolUse');
        recordSkillInvocation('seq-session', 'review-pr', 'PreToolUse');
        recordSkillInvocation('seq-session', 'commit', 'PreToolUse');

        const metrics = getSkillsMetrics('seq-session');
        expect(metrics.totalInvocations).toBe(3);
        expect(metrics.uniqueSkills).toEqual(['commit', 'review-pr']);
        expect(metrics.lastSkill).toBe('commit');
    });

    it('isolates skills metrics across distinct sessions', () => {
        recordSkillInvocation('session-a', 'commit', 'PreToolUse');
        recordSkillInvocation('session-a', 'review-pr', 'PreToolUse');
        recordSkillInvocation('session-b', 'lint', 'PreToolUse');

        expect(getSkillsMetrics('session-a').totalInvocations).toBe(2);
        expect(getSkillsMetrics('session-a').lastSkill).toBe('review-pr');
        expect(getSkillsMetrics('session-b').totalInvocations).toBe(1);
        expect(getSkillsMetrics('session-b').lastSkill).toBe('lint');

        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        expect(fs.readdirSync(cacheDir).length).toBe(2);
    });

    it.skipIf(process.platform === 'win32')('does not write through a planted symlink', () => {
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        fs.mkdirSync(cacheDir, { recursive: true });
        const sessionId = 'symlink-write-test';
        const symlinkPath = path.join(cacheDir, `skills-${sessionId}.jsonl`);
        const decoyTarget = path.join(testHomeDir, 'decoy.txt');
        fs.writeFileSync(decoyTarget, 'do not overwrite me');
        fs.symlinkSync(decoyTarget, symlinkPath);

        recordSkillInvocation(sessionId, 'commit', 'PreToolUse');

        expect(fs.readFileSync(decoyTarget, 'utf-8')).toBe('do not overwrite me');
        expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    });

    it('refuses to append when skills file exceeds size cap', () => {
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        fs.mkdirSync(cacheDir, { recursive: true });
        const sessionId = 'oversized';
        const filePath = path.join(cacheDir, `skills-${sessionId}.jsonl`);
        // Write a file larger than the 1 MiB cap
        fs.writeFileSync(filePath, 'a'.repeat(1024 * 1024 + 100));
        const sizeBefore = fs.statSync(filePath).size;

        recordSkillInvocation(sessionId, 'commit', 'PreToolUse');

        const sizeAfter = fs.statSync(filePath).size;
        expect(sizeAfter).toBe(sizeBefore);
    });

    it('refuses to append when projected size would exceed the cap', () => {
        const cacheDir = path.join(testHomeDir, '.cache', 'ccstatusline', 'skills');
        fs.mkdirSync(cacheDir, { recursive: true });
        const sessionId = 'near-cap';
        const filePath = path.join(cacheDir, `skills-${sessionId}.jsonl`);
        // Write a file just under the cap; the next invocation would push it over.
        fs.writeFileSync(filePath, 'a'.repeat(1024 * 1024 - 10));
        const sizeBefore = fs.statSync(filePath).size;

        recordSkillInvocation(sessionId, 'commit', 'PreToolUse');

        const sizeAfter = fs.statSync(filePath).size;
        expect(sizeAfter).toBe(sizeBefore);
    });
});
