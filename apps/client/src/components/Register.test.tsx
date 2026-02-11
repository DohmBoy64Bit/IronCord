import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from './Register';
import { useStore } from '../store';

describe('Register Component', () => {
    const onSwitch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({ user: null });
    });

    it('renders registration form', () => {
        render(<Register onSwitch={onSwitch} />);
        expect(screen.getByText('Create an account')).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/IRC Nickname/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });

    it('calls register API and sets user on success', async () => {
        const mockUser = { id: '1', email: 'test@test.com', irc_nick: 'tester' };
        (window.ironcord.register as any).mockResolvedValue({ success: true, user: mockUser });

        render(<Register onSwitch={onSwitch} />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText(/IRC Nickname/i), { target: { value: 'tester' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

        await waitFor(() => {
            expect(window.ironcord.register).toHaveBeenCalledWith({
                email: 'test@test.com',
                irc_nick: 'tester',
                password: 'password123',
            });
            expect(useStore.getState().user).toEqual(mockUser);
        });
    });

    it('displays error message on failure', async () => {
        (window.ironcord.register as any).mockResolvedValue({ success: false, message: 'Email already in use' });

        render(<Register onSwitch={onSwitch} />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'existing@test.com' } });
        fireEvent.change(screen.getByLabelText(/IRC Nickname/i), { target: { value: 'tester' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

        await waitFor(() => {
            expect(screen.getByText('Email already in use')).toBeInTheDocument();
        });
    });

    it('calls onSwitch when login link is clicked', () => {
        render(<Register onSwitch={onSwitch} />);
        fireEvent.click(screen.getByRole('button', { name: /Login/i }));
        expect(onSwitch).toHaveBeenCalled();
    });
});
