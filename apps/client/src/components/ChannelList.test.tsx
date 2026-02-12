import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChannelList from './ChannelList';
import { useStore } from '../store';

describe('ChannelList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            user: { id: 'u1', email: 'u@t.com', irc_nick: 'tester' },
            currentGuild: null,
            channels: {},
            currentChannel: null,
        });
    });

    it('renders "Direct Messages" when no guild is selected', () => {
        render(<ChannelList />);
        expect(screen.getByText('Direct Messages')).toBeInTheDocument();
    });

    it('fetches and renders channels when a guild is selected', async () => {
        const guild = { id: 'g1', name: 'Test Guild', irc_namespace_prefix: '#g1-' };
        const mockChannels = [
            { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#g1-general' },
            { id: 'c2', guild_id: 'g1', name: 'random', irc_channel_name: '#g1-random' },
        ];
        (window.ironcord.getChannels as any).mockResolvedValue(mockChannels);

        useStore.setState({ currentGuild: guild });
        render(<ChannelList />);

        expect(screen.getByText('Test Guild')).toBeInTheDocument();

        await waitFor(() => {
            expect(window.ironcord.getChannels).toHaveBeenCalledWith('g1');
            expect(screen.getByText('general')).toBeInTheDocument();
            expect(screen.getByText('random')).toBeInTheDocument();
        });
    });

    it('calls setCurrentChannel when a channel is clicked', async () => {
        const guild = { id: 'g1', name: 'Test Guild', irc_namespace_prefix: '#g1-' };
        const channels = [{ id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#g1-general' }];
        useStore.setState({
            currentGuild: guild,
            channels: { g1: channels }
        });

        render(<ChannelList />);

        fireEvent.click(screen.getByText('general'));
        expect(useStore.getState().currentChannel?.id).toBe('c1');
    });

    it('shows user nickname in profile bar', () => {
        const guild = { id: 'g1', name: 'G1', irc_namespace_prefix: '#g1-' };
        useStore.setState({
            currentGuild: guild,
            channels: { g1: [] } // Pre-set channels to avoid useEffect-triggered fetch transitions
        });
        render(<ChannelList />);

        expect(screen.getByText('tester')).toBeInTheDocument();
        expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('triggers mock event when settings icon is clicked', () => {
        const guild = { id: 'g1', name: 'G1', irc_namespace_prefix: '#g1-' };
        useStore.setState({
            currentGuild: guild,
            channels: { g1: [] }
        });
        render(<ChannelList />);

        const settingsButton = screen.getByTestId('Settings');
        fireEvent.click(settingsButton);
        // No crash is success here since it's a console.error mock
    });
});
