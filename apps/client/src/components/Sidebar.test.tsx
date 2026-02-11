import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';
import { useStore } from '../store';

describe('Sidebar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            guilds: [
                { id: '1', name: 'Alpha Guild', irc_namespace_prefix: '#alpha-' },
                { id: '2', name: 'Beta Guild', irc_namespace_prefix: '#beta-' },
            ],
            currentGuild: null,
        });
    });

    it('renders guild icons from store', () => {
        render(<Sidebar />);
        expect(screen.getByText('AL')).toBeInTheDocument(); // Alpha Guild
        expect(screen.getByText('BE')).toBeInTheDocument(); // Beta Guild

        expect(screen.getByText('Alpha Guild')).toBeInTheDocument();
        expect(screen.getByText('Beta Guild')).toBeInTheDocument();
    });

    it('calls setCurrentGuild when a guild icon is clicked', () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByText('AL'));

        expect(useStore.getState().currentGuild?.id).toBe('1');
    });

    it('shows selected styling for active guild', () => {
        const guild1 = { id: '1', name: 'Alpha Guild', irc_namespace_prefix: '#alpha-' };
        useStore.setState({ currentGuild: guild1 });
        render(<Sidebar />);

        const guildIcon = screen.getByText('AL').parentElement;
        expect(guildIcon).toHaveClass('bg-indigo-600');
    });

    it('opens CreateGuildModal when Add Server button is clicked', () => {
        render(<Sidebar />);
        const addButton = screen.getByTestId('Plus').closest('div');
        if (!addButton) throw new Error('Add button not found');

        fireEvent.click(addButton);

        expect(screen.getByText('Create your Guild')).toBeInTheDocument();
    });
});
