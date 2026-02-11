import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TitleBar from './TitleBar';

describe('TitleBar Component', () => {
    it('renders branding text', () => {
        render(<TitleBar />);
        expect(screen.getByText('IronCord')).toBeInTheDocument();
    });

    it('calls minimize when minimize button is clicked', () => {
        render(<TitleBar />);
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]); // Minimize is first
        expect(window.ironcord.windowControls.minimize).toHaveBeenCalled();
    });

    it('calls maximize when maximize button is clicked', () => {
        render(<TitleBar />);
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[1]); // Maximize is second
        expect(window.ironcord.windowControls.maximize).toHaveBeenCalled();
    });

    it('calls close when close button is clicked', () => {
        render(<TitleBar />);
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[2]); // Close is third
        expect(window.ironcord.windowControls.close).toHaveBeenCalled();
    });
});
