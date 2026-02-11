import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { useStore } from './store';

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({ user: null });
    });

    it('renders Login by default when no user is set', () => {
        render(<App />);
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    });

    it('renders Sidebar, ChannelList, and Chat when user is logged in', async () => {
        const mockUser = { id: 'u1', email: 'u@t.com', irc_nick: 'tester' };
        (window.ironcord.getMyGuilds as any).mockResolvedValue([]);

        useStore.setState({ user: mockUser });

        render(<App />);

        // sidebar and channel list should be present
        await waitFor(() => {
            expect(screen.getByText('tester')).toBeInTheDocument(); // in channel list profile
        });
        expect(screen.getAllByText('Direct Messages')[0]).toBeInTheDocument(); // fallback header or sidebar tooltip
        expect(screen.getByText('Select a channel')).toBeInTheDocument(); // chat fallback
    });

    it('connects to IRC and setup listeners on login', async () => {
        const mockUser = { id: 'u1', email: 'u@t.com', irc_nick: 'tester' };
        (window.ironcord.getMyGuilds as any).mockResolvedValue([]);
        (window.ironcord.connectIRC as any).mockResolvedValue(undefined);

        useStore.setState({ user: mockUser });

        render(<App />);

        await waitFor(() => {
            expect(window.ironcord.getMyGuilds).toHaveBeenCalled();
            expect(window.ironcord.connectIRC).toHaveBeenCalledWith('u1', expect.objectContaining({
                nick: 'tester',
            }));
            expect(window.ironcord.onIRCMessage).toHaveBeenCalled();
            expect(window.ironcord.onIRCHistory).toHaveBeenCalled();
        });
    });
});
