import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateGuildModal from './CreateGuildModal';
import { useStore } from '../store';

describe('CreateGuildModal', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({ guilds: [] });
    });

    it('renders template selection step by default', () => {
        render(<CreateGuildModal isOpen={true} onClose={onClose} />);
        expect(screen.getByText('Create your Guild')).toBeInTheDocument();
        expect(screen.getByText('Gaming')).toBeInTheDocument();
        expect(screen.getByText('Create My Own')).toBeInTheDocument();
    });

    it('transitions to customization step when a template is selected', () => {
        render(<CreateGuildModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Gaming'));
        expect(screen.getByText('Customize your server')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Gaming Server')).toBeInTheDocument();
    });

    it('transitions to customization step when "Create My Own" is clicked', () => {
        render(<CreateGuildModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Create My Own'));
        expect(screen.getByText('Customize your server')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/The Iron Vanguard/i)).toBeInTheDocument();
    });

    it('successfully creates a guild and closes', async () => {
        const mockGuild = { id: 'g1', name: 'Test Guild' };
        (window.ironcord.createGuild as any).mockResolvedValue(mockGuild);

        render(<CreateGuildModal isOpen={true} onClose={onClose} />);

        // Go to customization
        fireEvent.click(screen.getByText('Create My Own'));

        // Fill name
        fireEvent.change(screen.getByPlaceholderText(/The Iron Vanguard/i), { target: { value: 'Test Guild' } });

        // Submit
        fireEvent.click(screen.getByText('Create Guild'));

        await waitFor(() => {
            expect(window.ironcord.createGuild).toHaveBeenCalledWith('Test Guild');
            expect(useStore.getState().guilds).toContainEqual(mockGuild);
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('returns to templates when "Back" is clicked', () => {
        render(<CreateGuildModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Create My Own'));
        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByText('Create your Guild')).toBeInTheDocument();
    });
});
