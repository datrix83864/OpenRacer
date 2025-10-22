import React from 'react';
import { render, screen } from '@testing-library/react';
import Leaderboard from '../../../ui/components/Leaderboard';

test('renders leaderboard component', () => {
    render(<Leaderboard />);
    const linkElement = screen.getByText(/leaderboard/i);
    expect(linkElement).toBeInTheDocument();
});

test('displays correct number of racers', () => {
    const racers = [{ name: 'Racer 1', score: 100 }, { name: 'Racer 2', score: 200 }];
    render(<Leaderboard racers={racers} />);
    const racerElements = screen.getAllByRole('listitem');
    expect(racerElements.length).toBe(racers.length);
});