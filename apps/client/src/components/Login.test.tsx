import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { useStore } from '../store';

describe('Login Component', () => {
    const onSwitch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({ user: null });
    });

    it('renders login form', () => {
        render(<Login onSwitch={onSwitch} />);
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
    });

    it('calls login API and sets user on success', async () => {
        const mockUser = { id: '1', email: 'test@test.com', irc_nick: 'tester' };
        (window.ironcord.login as any).mockResolvedValue({ success: true, user: mockUser });

        render(<Login onSwitch={onSwitch} />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

        await waitFor(() => {
            expect(window.ironcord.login).toHaveBeenCalledWith({
                email: 'test@test.com',
                password: 'password123',
            });
            expect(useStore.getState().user).toEqual(mockUser);
        });
    });

    it('displays error message on failure', async () => {
        (window.ironcord.login as any).mockResolvedValue({ success: false, message: 'Invalid credentials' });

        render(<Login onSwitch={onSwitch} />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@test.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    it('calls onSwitch when register link is clicked', () => {
        render(<Login onSwitch={onSwitch} />);
        fireEvent.click(screen.getByRole('button', { name: /Register/i }));
        expect(onSwitch).toHaveBeenCalled();
    });
});
