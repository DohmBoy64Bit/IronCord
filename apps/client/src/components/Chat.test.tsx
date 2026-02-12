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
        expect(screen.getByText('Welcome, tester!')).toBeInTheDocument();
    });

    it('renders channel name and messages when a channel is selected', () => {
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
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
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
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
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
        useStore.setState({ currentChannel: channel });
        render(<Chat />);

        // Click pins icon
        const pinsButton = screen.getByTestId('Pin');
        fireEvent.click(pinsButton);

        expect(screen.getByText('Pinned Messages will be available in the full release.')).toBeInTheDocument();
    });

    it('renders dynamic members from the store', () => {
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
        const members = ['alice', 'bob', 'charlie'];
        useStore.setState({
            currentChannel: channel,
            members: { '#general': members }
        });

        render(<Chat />);

        // Toggle member list if it's hidden by default (the component shows it based on showMemberList state)
        // Actually, the component renders the list inside {showMemberList && ...}
        // I need to trigger the member list visibility first.
        const memberListButton = screen.getByTestId('Users');
        fireEvent.click(memberListButton);

        expect(screen.getByText('Online — 3')).toBeInTheDocument();
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
        expect(screen.getByText('charlie')).toBeInTheDocument();
    });

    it('sends message when Enter is pressed (without Shift)', async () => {
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
        useStore.setState({ currentChannel: channel });
        (window.ironcord.sendMessage as any).mockResolvedValue(undefined);

        render(<Chat />);

        const input = screen.getByPlaceholderText('Message #general');
        fireEvent.change(input, { target: { value: 'enter message' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => {
            expect(window.ironcord.sendMessage).toHaveBeenCalledWith('#general', 'enter message');
            expect(input).toHaveValue('');
        });
    });

    it('does not send message when Shift + Enter is pressed', async () => {
        const channel = { id: 'c1', guild_id: 'g1', name: 'general', irc_channel_name: '#general' };
        useStore.setState({ currentChannel: channel });
        (window.ironcord.sendMessage as any).mockResolvedValue(undefined);

        render(<Chat />);

        const input = screen.getByPlaceholderText('Message #general');
        fireEvent.change(input, { target: { value: 'shifted message' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true });

        // Wait a bit to ensure it WASN'T called
        await new Promise(r => setTimeout(r, 100));
        expect(window.ironcord.sendMessage).not.toHaveBeenCalled();
        expect(input).toHaveValue('shifted message');
    });
});
