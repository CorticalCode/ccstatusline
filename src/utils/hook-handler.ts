import { recordSkillInvocation } from './skills';

interface HookInput {
    session_id?: string;
    hook_event_name?: string;
    tool_name?: string;
    tool_input?: { skill?: string };
    prompt?: string;
}

export function handleHookInput(input: string | null): void {
    if (!input) {
        return;
    }

    try {
        const data = JSON.parse(input) as HookInput;
        const sessionId = data.session_id;
        if (!sessionId) {
            return;
        }

        let skillName = '';
        if (data.hook_event_name === 'PreToolUse' && data.tool_name === 'Skill') {
            skillName = data.tool_input?.skill ?? '';
        } else if (data.hook_event_name === 'UserPromptSubmit') {
            const match = /^\/([a-zA-Z0-9_:-]+)(?:\s|$)/.exec(data.prompt ?? '');
            if (match) {
                skillName = match[1] ?? '';
            }
        }

        if (!skillName) {
            return;
        }

        recordSkillInvocation(sessionId, skillName, data.hook_event_name ?? '');
    } catch { /* ignore parse errors */ }
}
