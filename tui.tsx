import React from 'react';
import { render, Box, Text } from 'ink';

interface MiniTenguOrchestratorProps {
    step: number;
    status: string;
    isComplete?: boolean;
}

export const MiniTenguOrchestrator: React.FC<MiniTenguOrchestratorProps> = ({
    step,
    status,
    isComplete = false
}) => {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={70}>
            <Box marginBottom={1}>
                <Text bold color="magenta">🤖 Mini-Meta CLI v3.0 -- LOCAL AGENT</Text>
            </Box>

            <Box>
                <Text color="yellow" bold>⚡ [Süreç {step}/3] İşleniyor... </Text>
                <Text color="white">{status}</Text>
            </Box>

            {isComplete && (
                <Box marginTop={1} flexDirection="column">
                    <Text color="green" bold>🚀 BAŞARILI: Ajan kontrolü ele aldı amk xd!</Text>
                    <Text color="gray" italic>İşlem tamamlandı.</Text>
                </Box>
            )}
        </Box>
    );
};

// Hem motorun import edebilmesi hem de tui.tsx'i doğrudan test edebilmen için render'ı buraya çakıyoruz:
render(<MiniTenguOrchestrator step={3} status="🔥 engine.ts kalbine sızıldı. Döngü hazır." isComplete={true} />);