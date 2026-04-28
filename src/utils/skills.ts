import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type {
    SkillInvocation,
    SkillsMetrics
} from '../types/SkillsMetrics';

const EMPTY: SkillsMetrics = { totalInvocations: 0, uniqueSkills: [], lastSkill: null };
const MAX_SKILLS_FILE_BYTES = 1024 * 1024;
const SESSION_ID_HASH_HEX_LEN = 32;

function getSkillsDir(): string {
    return path.join(os.homedir(), '.cache', 'ccstatusline', 'skills');
}

function sanitizeSessionId(sessionId: string): string {
    const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Hash if input was empty or contained any disallowed character — prevents
    // distinct sessions with all-illegal characters from collapsing to the same
    // cache filename, and prevents an empty leaf like "skills-.jsonl".
    if (!sanitized || sanitized !== sessionId) {
        return crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, SESSION_ID_HASH_HEX_LEN);
    }
    return sanitized;
}

export function getSkillsFilePath(sessionId: string): string {
    return path.join(getSkillsDir(), `skills-${sanitizeSessionId(sessionId)}.jsonl`);
}

export function getSkillsMetrics(sessionId: string): SkillsMetrics {
    const filePath = getSkillsFilePath(sessionId);
    let fd: number | null = null;
    try {
        // O_NOFOLLOW makes opening a symlinked path fail with ELOOP rather
        // than reading through the symlink. Combined with fstat on the open
        // fd, this also closes the TOCTOU window between stat and read.
        fd = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        const stats = fs.fstatSync(fd);
        if (!stats.isFile() || stats.size > MAX_SKILLS_FILE_BYTES) {
            return EMPTY;
        }
        const invocations: SkillInvocation[] = fs.readFileSync(fd, 'utf-8')
            .trim().split('\n')
            .filter(line => line.trim())
            .map((line) => {
                try { return JSON.parse(line) as SkillInvocation; } catch {
                    return null;
                }
            })
            .filter((e): e is SkillInvocation => e !== null && typeof e.skill === 'string' && typeof e.session_id === 'string');
        if (invocations.length === 0) {
            return EMPTY;
        }

        const uniqueSkills: string[] = [];
        const seenSkills = new Set<string>();
        for (let i = invocations.length - 1; i >= 0; i--) {
            const skill = invocations[i]?.skill;
            if (skill && !seenSkills.has(skill)) {
                seenSkills.add(skill);
                uniqueSkills.push(skill);
            }
        }

        return {
            totalInvocations: invocations.length,
            uniqueSkills,
            lastSkill: invocations[invocations.length - 1]?.skill ?? null
        };
    } catch {
        return EMPTY;
    } finally {
        if (fd !== null) {
            try { fs.closeSync(fd); } catch { /* ignore */ }
        }
    }
}

export function recordSkillInvocation(sessionId: string, skill: string, source: string): void {
    let fd: number | null = null;
    try {
        const filePath = getSkillsFilePath(sessionId);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // O_NOFOLLOW makes opening a symlinked path fail with ELOOP rather
        // than appending through the symlink. O_CREAT creates a fresh regular
        // file when the path is absent. fstat on the open fd verifies the
        // descriptor is a regular file, and the size cap prevents unbounded
        // growth.
        fd = fs.openSync(
            filePath,
            fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW
        );
        const stats = fs.fstatSync(fd);
        if (!stats.isFile() || stats.size > MAX_SKILLS_FILE_BYTES) {
            return;
        }
        const invocation: SkillInvocation = {
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            skill,
            source
        };
        fs.writeSync(fd, JSON.stringify(invocation) + '\n');
    } catch {
        // Best-effort — cache write failure should not break hook handling.
    } finally {
        if (fd !== null) {
            try { fs.closeSync(fd); } catch { /* ignore */ }
        }
    }
}
