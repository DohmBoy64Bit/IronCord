import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Chat from './Chat';
import { useStore } from '../store';

describe('Chat Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            user: { id: 'u1', email: 'u@t.com', irc_nick: 'tester' },
            currentChannel: null,
            messages: {},
        });

        // Mock scrollIntoView as it's not in jsdom
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('renders placeholder when no channel is selected', () => {
        render(<Chat />);
        expect(screen.getByText('Select a channel')).toBeInTheDocument();
        expect(screen.getByText('Welcome to IronCord')).toBeInTheDocument();
    });

    it('renders channel name and messages when a channel is selected', () => {
        const channel = { id: 'c1', name: 'general', irc_channel_name: '#general' };
        const messages = [
            { id: '1', channel: '#general', author: 'alice', content: 'hello', timestamp: Date.now() },
        ];
        useStore.setState({
            currentChannel: channel,
            messages: { '#general': messages }
        });

        render(<Chat />);

        expect(screen.getByText('general')).toBeInTheDocument();
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('calls sendMessage when form is submitted', async () => {
        const channel = { id: 'c1', name: 'general', irc_channel_name: '#general' };
        useStore.setState({ currentChannel: channel });
        (window.ironcord.sendMessage as any).mockResolvedValue(undefined);

        render(<Chat />);

        const input = screen.getByPlaceholderText('Message #general');
        fireEvent.change(input, { target: { value: 'test message' } });
        fireEvent.submit(input.closest('form')!);

        await waitFor(() => {
            expect(window.ironcord.sendMessage).toHaveBeenCalledWith('#general', 'test message');
            expect(input).toHaveValue('');
        });
    });

    it('shows feature toast when toolbar icons are clicked', async () => {
        const channel = { id: 'c1', name: 'general', irc_channel_name: '#general' };
        useStore.setState({ currentChannel: channel });
        render(<Chat />);

        // Click pins icon
        const pinsButton = screen.getByTestId('Pin');
        fireEvent.click(pinsButton);

        expect(screen.getByText('Pinned Messages — Coming soon!')).toBeInTheDocument();
    });
});
