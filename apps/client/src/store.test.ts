import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('useStore', () => {
    beforeEach(() => {
        // Reset store to initial state
        useStore.setState({
            user: null,
            guilds: [],
            channels: {},
            currentGuild: null,
            currentChannel: null,
            messages: {},
        });
    });

    it('should set user', () => {
        const user = { id: '1', email: 'test@test.com', irc_nick: 'tester' };
        useStore.getState().setUser(user);
        expect(useStore.getState().user).toEqual(user);
    });

    it('should set guilds', () => {
        const guilds = [{ id: '1', name: 'G1', irc_namespace_prefix: '#g1-' }];
        useStore.getState().setGuilds(guilds);
        expect(useStore.getState().guilds).toEqual(guilds);
    });

    it('should set channels for a guild', () => {
        const channels = [{ id: '1', guild_id: 'g1', name: 'C1', irc_channel_name: '#g1-c1' }];
        useStore.getState().setChannels('g1', channels);
        expect(useStore.getState().channels['g1']).toEqual(channels);
    });

    it('should set current guild and reset current channel', () => {
        const guild = { id: '1', name: 'G1', irc_namespace_prefix: '#g1-' };
        useStore.setState({ currentChannel: { id: 'x' } as any });

        useStore.getState().setCurrentGuild(guild);

        expect(useStore.getState().currentGuild).toEqual(guild);
        expect(useStore.getState().currentChannel).toBeNull();
    });

    it('should set current channel', () => {
        const channel = { id: '1', guild_id: 'g1', name: 'C1', irc_channel_name: '#g1-c1' };
        useStore.getState().setCurrentChannel(channel);
        expect(useStore.getState().currentChannel).toEqual(channel);
    });

    it('should add messages to a channel', () => {
        const msg = { id: '1', channel: '#c1', author: 'a', content: 'hi', timestamp: Date.now() };
        useStore.getState().addMessage('#c1', msg);
        expect(useStore.getState().messages['#c1']).toContain(msg);

        const msg2 = { id: '2', channel: '#c1', author: 'b', content: 'hey', timestamp: Date.now() };
        useStore.getState().addMessage('#c1', msg2);
        expect(useStore.getState().messages['#c1']).toHaveLength(2);
        expect(useStore.getState().messages['#c1'][1]).toEqual(msg2);
    });

    it('should set all messages for a channel', () => {
        const msgs = [
            { id: '1', channel: '#c1', author: 'a', content: 'hi', timestamp: Date.now() },
            { id: '2', channel: '#c1', author: 'b', content: 'hey', timestamp: Date.now() }
        ];
        useStore.getState().setMessages('#c1', msgs);
        expect(useStore.getState().messages['#c1']).toEqual(msgs);
    });
});
