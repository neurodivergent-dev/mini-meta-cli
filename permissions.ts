/**
 * Shell permission guard — blocks destructive commands before execution.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/\s*$/i,
  /rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*.*[\\/]/i,
  /rm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*.*[\\/]/i,
  /del\s+\/s\s+\/q\s+[cC]:\\/i,
  /rd\s+\/s\s+\/q\s+[cC]:\\/i,
  /format\s+[a-zA-Z]:/i,
  /mkfs\./i,
  /: \(\)\s*\{\s*:\|:&\s*\};:/, // fork bomb
  /shutdown\b/i,
  /reboot\b/i,
  /Remove-Item\s+.*-Recurse.*[cC]:\\/i,
  /reg\s+delete\s+HK/i,
  /diskpart\b/i,
  /cipher\s+\/w/i,
  /dd\s+if=.*of=\\\\?\.?\\/i,
];

const WARN_PATTERNS: RegExp[] = [
  /git\s+push\s+.*--force/i,
  /git\s+reset\s+--hard/i,
  /npm\s+publish/i,
  /drop\s+database/i,
  /drop\s+table/i,
];

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

export function checkShellCommand(command: string): PermissionResult {
  const cmd = command.trim();
  if (!cmd) {
    return { allowed: false, reason: "Boş komut." };
  }

  for (const re of BLOCKED_PATTERNS) {
    if (re.test(cmd)) {
      return {
        allowed: false,
        reason: `Güvenlik: yıkıcı komut engellendi → ${cmd.slice(0, 80)}`,
      };
    }
  }

  for (const re of WARN_PATTERNS) {
    if (re.test(cmd)) {
      return {
        allowed: true,
        warning: `Dikkat: potansiyel riskli komut çalıştırılıyor: ${cmd.slice(0, 80)}`,
      };
    }
  }

  return { allowed: true };
}
